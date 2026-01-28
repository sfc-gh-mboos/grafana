import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProvider } from 'test/helpers/TestProvider';

import { config, locationService } from '@grafana/runtime';

import { Playlist } from '../../api/clients/playlist/v0alpha1';

import { StartModal } from './StartModal';

const mockNavigate = jest.fn();
jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  reportInteraction: jest.fn(),
}));

const mockPlaylist: Playlist = {
  apiVersion: 'playlist.grafana.app/v0alpha1',
  kind: 'Playlist',
  spec: {
    title: 'Test Playlist',
    interval: '5m',
    items: [],
  },
  metadata: {
    name: 'test-playlist',
  },
  status: {},
};

describe('StartModal', () => {
  const onDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    config.featureToggles.playlistUseNavigate = false;
  });

  afterEach(() => {
    config.featureToggles.playlistUseNavigate = false;
  });

  describe('when feature flag is disabled', () => {
    it('should use locationService.push when starting playlist', async () => {
      render(
        <TestProvider>
          <StartModal playlist={mockPlaylist} onDismiss={onDismiss} />
        </TestProvider>
      );

      expect(locationService.getLocation().pathname).toEqual('/');

      const startButton = screen.getByRole('button', { name: /start test playlist/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(locationService.getLocation().pathname).toEqual('/playlists/play/test-playlist');
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should include query params when starting playlist', async () => {
      render(
        <TestProvider>
          <StartModal playlist={mockPlaylist} onDismiss={onDismiss} />
        </TestProvider>
      );

      // Set kiosk mode
      const kioskRadio = screen.getByRole('radio', { name: /kiosk/i });
      fireEvent.click(kioskRadio);

      // Enable autofit
      const autofitCheckbox = screen.getByRole('checkbox', { name: /autofit/i });
      await userEvent.click(autofitCheckbox);

      const startButton = screen.getByRole('button', { name: /start test playlist/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        const location = locationService.getLocation();
        expect(location.pathname).toEqual('/playlists/play/test-playlist');
        expect(location.search).toContain('kiosk');
        expect(location.search).toContain('autofitpanels');
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('when feature flag is enabled', () => {
    beforeEach(() => {
      config.featureToggles.playlistUseNavigate = true;
    });

    it('should use navigate when starting playlist', async () => {
      render(
        <TestProvider>
          <StartModal playlist={mockPlaylist} onDismiss={onDismiss} />
        </TestProvider>
      );

      expect(locationService.getLocation().pathname).toEqual('/');

      const startButton = screen.getByRole('button', { name: /start test playlist/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/playlists/play/test-playlist');
      });
      expect(locationService.getLocation().pathname).not.toEqual('/playlists/play/test-playlist');
    });

    it('should include query params when starting playlist with navigate', async () => {
      render(
        <TestProvider>
          <StartModal playlist={mockPlaylist} onDismiss={onDismiss} />
        </TestProvider>
      );

      // Set kiosk mode
      const kioskRadio = screen.getByRole('radio', { name: /kiosk/i });
      fireEvent.click(kioskRadio);

      // Enable autofit
      const autofitCheckbox = screen.getByRole('checkbox', { name: /autofit/i });
      await userEvent.click(autofitCheckbox);

      const startButton = screen.getByRole('button', { name: /start test playlist/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
        const navigateCall = mockNavigate.mock.calls[0][0];
        expect(navigateCall).toContain('/playlists/play/test-playlist');
        expect(navigateCall).toContain('kiosk');
        expect(navigateCall).toContain('autofitpanels');
      });
      expect(locationService.getLocation().pathname).not.toEqual('/playlists/play/test-playlist');
    });
  });
});
