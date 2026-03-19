package api

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/apimachinery/identity"
	"github.com/grafana/grafana/pkg/infra/log"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/shorturls"
	"github.com/grafana/grafana/pkg/services/user"
	"github.com/grafana/grafana/pkg/setting"
)

func TestShortURLAPIEndpoint(t *testing.T) {
	t.Run("Given expiresInSeconds in the request body", func(t *testing.T) {
		cmd := dtos.CreateShortURLCmd{
			Path:             "d/TxKARsmGz/new-dashboard?orgId=1",
			ExpiresInSeconds: 3600,
		}

		capturedExpiresIn := int64(0)
		service := &fakeShortURLService{
			createShortURLFunc: func(ctx context.Context, user identity.Requester, cmd *dtos.CreateShortURLCmd) (*shorturls.ShortUrl, error) {
				capturedExpiresIn = cmd.ExpiresInSeconds
				return &shorturls.ShortUrl{
					Id:    1,
					OrgId: testOrgID,
					Uid:   "N1u6L4eGz",
					Path:  cmd.Path,
				}, nil
			},
			createConvertShortURLToDTO: func(shortURL *shorturls.ShortUrl, appURL string) *dtos.ShortURL {
				return &dtos.ShortURL{UID: shortURL.Uid, URL: "http://localhost:3000/goto/N1u6L4eGz?orgId=1"}
			},
		}

		createShortURLScenario(t, "When calling POST on", "/api/short-urls", "/api/short-urls", cmd, service,
			func(sc *scenarioContext) {
				callCreateShortURL(sc)
				require.Equal(t, int64(3600), capturedExpiresIn)
			})
	})

	t.Run("Given a correct request for creating a shortUrl", func(t *testing.T) {
		cmd := dtos.CreateShortURLCmd{
			Path: "d/TxKARsmGz/new-dashboard?orgId=1&from=1599389322894&to=1599410922894",
		}

		createResp := &shorturls.ShortUrl{
			Id:    1,
			OrgId: testOrgID,
			Uid:   "N1u6L4eGz",
			Path:  cmd.Path,
		}
		service := &fakeShortURLService{
			createShortURLFunc: func(ctx context.Context, user identity.Requester, cmd *dtos.CreateShortURLCmd) (*shorturls.ShortUrl, error) {
				return createResp, nil
			},
			createConvertShortURLToDTO: func(shortURL *shorturls.ShortUrl, appURL string) *dtos.ShortURL {
				return &dtos.ShortURL{UID: createResp.Uid, URL: "http://localhost:3000/goto/N1u6L4eGz?orgId=1"}
			},
		}

		createShortURLScenario(t, "When calling POST on", "/api/short-urls", "/api/short-urls", cmd, service,
			func(sc *scenarioContext) {
				callCreateShortURL(sc)

				shortUrl := dtos.ShortURL{}
				err := json.NewDecoder(sc.resp.Body).Decode(&shortUrl)
				require.NoError(t, err)
				require.Equal(t, 200, sc.resp.Code)
				require.Equal(t, fmt.Sprintf("http://localhost:3000/goto/%s?orgId=%d", createResp.Uid, createResp.OrgId), shortUrl.URL)
			})
	})

	t.Run("Given a correct request for deleting a shortUrl", func(t *testing.T) {
		service := &fakeShortURLService{
			deleteStaleShortURLsFunc: func(ctx context.Context, cmd *shorturls.DeleteShortUrlCommand) error {
				require.Equal(t, "N1u6L4eGz", cmd.Uid)
				cmd.NumDeleted = 1
				return nil
			},
		}

		deleteShortURLScenario(t, "/api/short-urls/N1u6L4eGz", "/api/short-urls/:uid", service,
			func(sc *scenarioContext) {
				callDeleteShortURL(sc, "N1u6L4eGz")
				require.Equal(t, 200, sc.resp.Code)
			})
	})

	t.Run("Given a delete request for an invalid uid", func(t *testing.T) {
		service := &fakeShortURLService{}

		deleteShortURLScenario(t, "/api/short-urls/not-valid-uid", "/api/short-urls/:uid", service,
			func(sc *scenarioContext) {
				callDeleteShortURL(sc, "not-valid-uid")
				require.Equal(t, 400, sc.resp.Code)
			})
	})
}

func callCreateShortURL(sc *scenarioContext) {
	sc.fakeReqWithParams("POST", sc.url, map[string]string{}).exec()
}

func callDeleteShortURL(sc *scenarioContext, uid string) {
	sc.fakeReqWithParams("DELETE", sc.url, map[string]string{"uid": uid}).exec()
}

func createShortURLScenario(t *testing.T, desc string, url string, routePattern string, cmd dtos.CreateShortURLCmd, shortURLService shorturls.Service, fn scenarioFunc) {
	t.Run(fmt.Sprintf("%s %s", desc, url), func(t *testing.T) {
		hs := HTTPServer{
			Cfg:             setting.NewCfg(),
			ShortURLService: shortURLService,
			log:             log.New("test"),
		}

		sc := setupScenarioContext(t, url)
		sc.defaultHandler = routing.Wrap(func(c *contextmodel.ReqContext) response.Response {
			c.Req.Body = mockRequestBody(cmd)
			c.Req.Header.Add("Content-Type", "application/json")
			sc.context = c
			sc.context.SignedInUser = &user.SignedInUser{OrgID: testOrgID, UserID: testUserID}

			return hs.createShortURL(c)
		})

		sc.m.Post(routePattern, sc.defaultHandler)

		fn(sc)
	})
}

func deleteShortURLScenario(
	t *testing.T,
	url string,
	routePattern string,
	shortURLService shorturls.Service,
	fn scenarioFunc,
) {
	t.Run(fmt.Sprintf("When calling DELETE on %s", url), func(t *testing.T) {
		hs := HTTPServer{
			Cfg:             setting.NewCfg(),
			ShortURLService: shortURLService,
			log:             log.New("test"),
		}

		sc := setupScenarioContext(t, url)
		sc.defaultHandler = routing.Wrap(func(c *contextmodel.ReqContext) response.Response {
			sc.context = c
			sc.context.SignedInUser = &user.SignedInUser{OrgID: testOrgID, UserID: testUserID}
			return hs.deleteShortURL(c)
		})

		sc.m.Delete(routePattern, sc.defaultHandler)
		fn(sc)
	})
}

type fakeShortURLService struct {
	createShortURLFunc         func(ctx context.Context, user identity.Requester, cmd *dtos.CreateShortURLCmd) (*shorturls.ShortUrl, error)
	createConvertShortURLToDTO func(shortURL *shorturls.ShortUrl, appURL string) *dtos.ShortURL
	deleteStaleShortURLsFunc   func(ctx context.Context, cmd *shorturls.DeleteShortUrlCommand) error
}

func (s *fakeShortURLService) List(ctx context.Context, orgID int64) ([]*shorturls.ShortUrl, error) {
	return nil, nil
}

func (s *fakeShortURLService) GetShortURLByUID(ctx context.Context, user identity.Requester, uid string) (*shorturls.ShortUrl, error) {
	return nil, nil
}

func (s *fakeShortURLService) CreateShortURL(ctx context.Context, user identity.Requester, cmd *dtos.CreateShortURLCmd) (*shorturls.ShortUrl, error) {
	if s.createShortURLFunc != nil {
		return s.createShortURLFunc(ctx, user, cmd)
	}

	return nil, nil
}

func (s *fakeShortURLService) UpdateLastSeenAt(ctx context.Context, shortURL *shorturls.ShortUrl) error {
	return nil
}

func (s *fakeShortURLService) DeleteStaleShortURLs(ctx context.Context, cmd *shorturls.DeleteShortUrlCommand) error {
	if s.deleteStaleShortURLsFunc != nil {
		return s.deleteStaleShortURLsFunc(ctx, cmd)
	}
	return nil
}

func (s *fakeShortURLService) ConvertShortURLToDTO(shortURL *shorturls.ShortUrl, appURL string) *dtos.ShortURL {
	if s.createConvertShortURLToDTO != nil {
		return s.createConvertShortURLToDTO(shortURL, appURL)
	}
	return nil
}
