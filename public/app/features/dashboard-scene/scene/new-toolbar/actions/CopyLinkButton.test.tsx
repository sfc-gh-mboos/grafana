import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getPanelPlugin } from '@grafana/data/test';
import { selectors } from '@grafana/e2e-selectors';
import { setPluginImportUtils } from '@grafana/runtime';
import { SceneGridLayout, SceneTimeRange, VizPanel } from '@grafana/scenes';
import { mockLocalStorage } from 'app/features/alerting/unified/mocks';
import { DashboardInteractions } from 'app/features/dashboard-scene/utils/interactions';
import { activateFullSceneTree } from 'app/features/dashboard-scene/utils/test-utils';

import { DashboardScene } from '../../DashboardScene';
import { DashboardGridItem } from '../../layout-default/DashboardGridItem';
import { DefaultGridLayoutManager } from '../../layout-default/DefaultGridLayoutManager';

import { CopyLinkButton } from './CopyLinkButton';

jest.mock('app/features/dashboard-scene/utils/interactions', () => ({
  DashboardInteractions: {
    toolbarCopyLinkClick: jest.fn(),
  },
}));

jest.mock('../../../sharing/ShareButton/utils', () => ({
  buildShareUrl: jest.fn().mockResolvedValue(undefined),
}));

const localStorageMock = mockLocalStorage();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

setPluginImportUtils({
  importPanelPlugin: (id: string) => Promise.resolve(getPanelPlugin({})),
  getPanelPluginFromCache: (id: string) => undefined,
});

function buildTestScene(overrides?: Partial<{ isEditing: boolean; isDirty: boolean }>) {
  const scene = new DashboardScene({
    uid: 'test-uid',
    $timeRange: new SceneTimeRange({ from: 'now-6h', to: 'now' }),
    isEditing: overrides?.isEditing ?? false,
    isDirty: overrides?.isDirty ?? false,
    body: new DefaultGridLayoutManager({
      grid: new SceneGridLayout({
        children: [new DashboardGridItem({ body: new VizPanel({ key: 'panel-1', pluginId: 'text' }) })],
      }),
    }),
  });
  activateFullSceneTree(scene);
  return scene;
}

describe('CopyLinkButton', () => {
  afterEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('should render the copy link button', () => {
    render(<CopyLinkButton dashboard={buildTestScene()} />);
    expect(screen.getByTestId(selectors.pages.Dashboard.DashNav.copyLinkButton)).toBeInTheDocument();
  });

  it('should call buildShareUrl and track interaction when clicked', async () => {
    const { buildShareUrl } = jest.requireMock('../../../sharing/ShareButton/utils');
    render(<CopyLinkButton dashboard={buildTestScene()} />);

    await userEvent.click(screen.getByTestId(selectors.pages.Dashboard.DashNav.copyLinkButton));

    expect(DashboardInteractions.toolbarCopyLinkClick).toHaveBeenCalled();
    expect(buildShareUrl).toHaveBeenCalled();
  });
});
