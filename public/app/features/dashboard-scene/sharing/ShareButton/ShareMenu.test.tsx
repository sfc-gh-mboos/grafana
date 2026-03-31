import { fireEvent, render, screen } from '@testing-library/react';

import { selectors as e2eSelectors } from '@grafana/e2e-selectors';
import { config } from '@grafana/runtime';
import { SceneTimeRange, VizPanel } from '@grafana/scenes';
import { ModalsContext } from '@grafana/ui';
import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/types/accessControl';

import { grantUserPermissions } from '../../../alerting/unified/mocks';
import { DashboardScene, DashboardSceneState } from '../../scene/DashboardScene';
import { DefaultGridLayoutManager } from '../../scene/layout-default/DefaultGridLayoutManager';

import ShareMenu from './ShareMenu';

const createAndCopyDashboardShortLinkMock = jest.fn();
const copyStringToClipboardMock = jest.fn();
const dispatchMock = jest.fn();
jest.mock('app/core/utils/shortLinks', () => ({
  ...jest.requireActual('app/core/utils/shortLinks'),
  createAndCopyDashboardShortLink: () => createAndCopyDashboardShortLinkMock(),
}));
jest.mock('app/core/utils/explore', () => ({
  ...jest.requireActual('app/core/utils/explore'),
  copyStringToClipboard: (value: string) => copyStringToClipboardMock(value),
}));
jest.mock('app/store/store', () => ({
  ...jest.requireActual('app/store/store'),
  dispatch: (value: unknown) => dispatchMock(value),
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
    expect(await screen.findByTestId(selector.copyDashboardUid)).toBeInTheDocument();
  });

  it('should not share externally when public dashboard is disabled', async () => {
    config.publicDashboardsEnabled = false;
    setup();

    expect(screen.queryByTestId(selector.shareExternally)).not.toBeInTheDocument();
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

  it('copies dashboard uid and bypasses save modal in dirty edit mode', async () => {
    const showModal = jest.fn();
    setup(
      { isEditing: true, isDirty: true, uid: 'copy-me-123' },
      {
        showModal,
      }
    );

    fireEvent.click(await screen.findByTestId(selector.copyDashboardUid));

    expect(copyStringToClipboardMock).toHaveBeenCalledWith('copy-me-123');
    expect(dispatchMock).toHaveBeenCalled();
    expect(showModal).not.toHaveBeenCalled();
  });
});

function setup(
  overrides?: Partial<DashboardSceneState>,
  modalContextOverrides?: Partial<{ showModal: (...args: unknown[]) => void; hideModal: () => void }>
) {
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

  render(
    <ModalsContext.Provider
      value={{
        showModal: jest.fn(),
        hideModal: jest.fn(),
        ...modalContextOverrides,
      }}
    >
      <ShareMenu dashboard={dashboard} />
    </ModalsContext.Provider>
  );
}
