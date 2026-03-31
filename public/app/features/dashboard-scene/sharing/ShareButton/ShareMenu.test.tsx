import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { selectors as e2eSelectors } from '@grafana/e2e-selectors';
import { config } from '@grafana/runtime';
import { SceneTimeRange, VizPanel } from '@grafana/scenes';
import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/types/accessControl';

import { grantUserPermissions } from '../../../alerting/unified/mocks';
import { DashboardScene, DashboardSceneState } from '../../scene/DashboardScene';
import { DefaultGridLayoutManager } from '../../scene/layout-default/DefaultGridLayoutManager';

import ShareMenu from './ShareMenu';

const createAndCopyDashboardShortLinkMock = jest.fn();
jest.mock('app/core/utils/shortLinks', () => ({
  ...jest.requireActual('app/core/utils/shortLinks'),
  createAndCopyDashboardShortLink: () => createAndCopyDashboardShortLinkMock(),
}));

const copyStringToClipboardMock = jest.fn();
jest.mock('app/core/utils/explore', () => ({
  ...jest.requireActual('app/core/utils/explore'),
  copyStringToClipboard: (...args: unknown[]) => copyStringToClipboardMock(...args),
}));

const mockNotifyAppSuccess = jest.fn();
jest.mock('app/core/copy/appNotification', () => ({
  ...jest.requireActual('app/core/copy/appNotification'),
  useAppNotification: () => ({
    success: mockNotifyAppSuccess,
    warning: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

const selector = e2eSelectors.pages.Dashboard.DashNav.newShareButton.menu;

describe('ShareMenu', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should render menu items', async () => {
    Object.defineProperty(contextSrv, 'isSignedIn', {
      value: true,
    });
    grantUserPermissions([AccessControlAction.SnapshotsCreate, AccessControlAction.OrgUsersAdd]);

    config.publicDashboardsEnabled = true;
    config.snapshotEnabled = true;
    config.externalUserMngLinkUrl = 'http://localhost:3000';
    setup({ meta: { canEdit: true } });

    expect(await screen.findByTestId(selector.shareInternally)).toBeInTheDocument();
    expect(await screen.findByTestId(selector.shareExternally)).toBeInTheDocument();
    expect(await screen.findByTestId(selector.shareSnapshot)).toBeInTheDocument();
  });

  it('should not share externally when public dashboard is disabled', async () => {
    config.publicDashboardsEnabled = false;
    setup();

    expect(screen.queryByTestId(selector.shareExternally)).not.toBeInTheDocument();
  });

  describe('CopyDashboardUID', () => {
    it('should render copy dashboard UID option when dashboard has a UID', async () => {
      setup({ uid: 'my-dashboard-uid' });

      expect(await screen.findByTestId(selector.copyDashboardUID)).toBeInTheDocument();
    });

    it('should not render copy dashboard UID option when dashboard has no UID', async () => {
      setup({ uid: undefined });

      expect(screen.queryByTestId(selector.copyDashboardUID)).not.toBeInTheDocument();
    });

    it('should copy UID to clipboard and show toast on click', async () => {
      setup({ uid: 'my-dashboard-uid' });

      const menuItem = await screen.findByTestId(selector.copyDashboardUID);
      await userEvent.click(menuItem);

      expect(copyStringToClipboardMock).toHaveBeenCalledWith('my-dashboard-uid');
      expect(mockNotifyAppSuccess).toHaveBeenCalledWith('Dashboard UID copied to clipboard');
    });
  });

  describe('ShareSnapshot', () => {
    it('should not share snapshot when user is not signed in', async () => {
      config.snapshotEnabled = true;
      Object.defineProperty(contextSrv, 'isSignedIn', {
        value: false,
      });
      setup({ meta: { canEdit: true } });

      expect(screen.queryByTestId(selector.shareSnapshot)).not.toBeInTheDocument();
    });
    it('should not share snapshot when snapshot is not enabled', async () => {
      Object.defineProperty(contextSrv, 'isSignedIn', {
        value: true,
      });
      config.snapshotEnabled = false;
      setup({ meta: { canEdit: true } });

      expect(screen.queryByTestId(selector.shareSnapshot)).not.toBeInTheDocument();
    });
    it('should not share snapshot without permissions', async () => {
      Object.defineProperty(contextSrv, 'isSignedIn', {
        value: true,
      });
      config.snapshotEnabled = true;
      setup({ meta: { canEdit: false } });

      expect(screen.queryByTestId(selector.shareSnapshot)).not.toBeInTheDocument();
    });
  });
});

function setup(overrides?: Partial<DashboardSceneState>) {
  const panel = new VizPanel({
    title: 'Panel A',
    pluginId: 'table',
    key: 'panel-12',
  });

  const dashboard = new DashboardScene({
    title: 'hello',
    uid: 'dash-1',
    $timeRange: new SceneTimeRange({}),
    body: DefaultGridLayoutManager.fromVizPanels([panel]),
    ...overrides,
  });

  render(<ShareMenu dashboard={dashboard} />);
}
