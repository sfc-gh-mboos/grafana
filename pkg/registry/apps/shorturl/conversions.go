package shorturl

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	shorturl "github.com/grafana/grafana/apps/shorturl/pkg/apis/shorturl/v1beta1"
	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/services/apiserver/endpoints/request"
	"github.com/grafana/grafana/pkg/services/shorturls"
)

func convertToK8sResource(v *shorturls.ShortUrl, namespacer request.NamespaceMapper) *shorturl.ShortURL {
	spec := shorturl.ShortURLSpec{
		Path: v.Path,
	}
	status := shorturl.ShortURLStatus{
		LastSeenAt: v.LastSeenAt,
	}
	annotations := map[string]string{}
	if v.ExpiresAt > 0 {
		annotations[shorturl.ExpiresAtAnnotation] = strconv.FormatInt(v.ExpiresAt, 10)
	}

	// resourceVersion can't be 0, since we are using the lastSeenAt value, when it's zero we default to current time
	resourceVersion := fmt.Sprintf("%d", v.LastSeenAt)
	if v.LastSeenAt == 0 {
		resourceVersion = fmt.Sprintf("%d", time.Now().Unix())
	}

	p := &shorturl.ShortURL{
		ObjectMeta: metav1.ObjectMeta{
			Name:              v.Uid,
			ResourceVersion:   resourceVersion,
			CreationTimestamp: metav1.NewTime(time.Unix(v.CreatedAt, 0)),
			Namespace:         namespacer(v.OrgId),
			Annotations:       annotations,
		},
		Spec:   spec,
		Status: status,
	}
	return p
}

func LegacyCreateCommandToUnstructured(cmd dtos.CreateShortURLCmd) unstructured.Unstructured {
	metadata := map[string]interface{}{
		"name": cmd.UID,
	}
	if cmd.ExpiresInSeconds > 0 {
		metadata["annotations"] = map[string]interface{}{
			shorturl.TTLSecondsAnnotation: strconv.FormatInt(cmd.ExpiresInSeconds, 10),
		}
	}

	obj := unstructured.Unstructured{
		Object: map[string]interface{}{
			"metadata": metadata,
			"spec": map[string]interface{}{
				"path": cmd.Path,
			},
		},
	}
	return obj
}

func UnstructuredToLegacyShortURLDTO(item unstructured.Unstructured, appURL string) *dtos.ShortURL {
	url := fmt.Sprintf("%s/goto/%s?orgId=%s", strings.TrimSuffix(appURL, "/"), item.GetName(), item.GetNamespace())

	return &dtos.ShortURL{
		UID: item.GetName(),
		URL: url,
	}
}

func UnstructuredToLegacyShortURL(item unstructured.Unstructured) *shorturls.ShortUrl {
	path, _, _ := unstructured.NestedString(item.Object, "spec", "path")
	lastSeenAt, _, _ := unstructured.NestedInt64(item.Object, "status", "lastSeenAt")
	annotations, _, _ := unstructured.NestedStringMap(item.Object, "metadata", "annotations")
	expiresAt, _ := shorturl.GetExpirationTimestamp(annotations, item.GetCreationTimestamp().Time)

	return &shorturls.ShortUrl{
		Uid:        item.GetName(),
		Path:       path,
		LastSeenAt: lastSeenAt,
		ExpiresAt:  expiresAt,
	}
}
