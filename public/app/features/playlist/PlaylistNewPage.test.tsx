import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { TestProvider } from 'test/helpers/TestProvider';

import { selectors } from '@grafana/e2e-selectors';
import { config, locationService } from '@grafana/runtime';

import { createFetchResponse } from '../../../test/helpers/createFetchResponse';
import { backendSrv } from '../../core/services/backend_srv';

import { PlaylistNewPage } from './PlaylistNewPage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getBackendSrv: () => backendSrv,
}));

jest.mock('app/core/components/TagFilter/TagFilter', () => ({
  TagFilter: () => {
    return <>mocked-tag-filter</>;
  },
}));

function getTestContext() {
  jest.clearAllMocks();

  // Create separate spies for different HTTP methods
  const postSpy = jest.fn();
  const otherSpy = jest.fn();

  const backendSrvMock = jest.spyOn(backendSrv, 'fetch').mockImplementation((options) => {
    if (options.method === 'POST') {
      postSpy(options);
      return of(createFetchResponse({}));
    }
    // Handle GET and other methods
    otherSpy(options);
    return of(createFetchResponse({ items: [] }));
  });

  jest.spyOn(backendSrv, 'search').mockResolvedValue([]);

  const { rerender } = render(
    <TestProvider>
      <PlaylistNewPage />
    </TestProvider>
  );

  return { rerender, backendSrvMock, postSpy, otherSpy };
}

describe('PlaylistNewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    config.featureToggles.playlistUseNavigate = false;
  });

  afterEach(() => {
    config.featureToggles.playlistUseNavigate = false;
  });

  describe('when mounted', () => {
    it('then header should be correct', async () => {
      getTestContext();

      expect(await screen.findByRole('heading', { name: /new playlist/i })).toBeInTheDocument();
    });
  });

  describe('when submitted', () => {
    it('then correct api should be called', async () => {
      const { postSpy } = getTestContext();

      expect(locationService.getLocation().pathname).toEqual('/');

      await userEvent.type(screen.getByRole('textbox', { name: selectors.pages.PlaylistForm.name }), 'A new name');
      fireEvent.submit(screen.getByRole('button', { name: /save/i }));
      await waitFor(() => expect(postSpy).toHaveBeenCalledTimes(1));

      expect(postSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            spec: {
              title: 'A new name',
              interval: '5m',
              items: [],
            },
          }),
        })
      );
      await waitFor(() => {
        expect(locationService.getLocation().pathname).toEqual('/playlists');
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('when feature flag is enabled, should use navigate', async () => {
      config.featureToggles.playlistUseNavigate = true;
      getTestContext();

      await userEvent.type(screen.getByRole('textbox', { name: selectors.pages.PlaylistForm.name }), 'A new name');
      fireEvent.submit(screen.getByRole('button', { name: /save/i }));
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/playlists'));
    });
  });
});
