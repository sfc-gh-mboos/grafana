import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SceneTimeRange, VizPanel } from '@grafana/scenes';

import { DashboardScene } from '../../scene/DashboardScene';
import { DefaultGridLayoutManager } from '../../scene/layout-default/DefaultGridLayoutManager';

import { CopyDashboardLinkModal } from './CopyDashboardLinkModal';
import { buildShareUrlWithExpiration } from './utils';

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  buildShareUrlWithExpiration: jest.fn(),
}));

const buildShareUrlWithExpirationMock = jest.mocked(buildShareUrlWithExpiration);

describe('CopyDashboardLinkModal', () => {
  it('copies dashboard link with default expiration', async () => {
    const onDismiss = jest.fn();
    buildShareUrlWithExpirationMock.mockResolvedValue(undefined);
    const { dashboard } = setup();

    render(<CopyDashboardLinkModal dashboard={dashboard} onDismiss={onDismiss} />);

    await userEvent.click(screen.getByRole('button', { name: 'Copy dashboard link' }));

    expect(buildShareUrlWithExpirationMock).toHaveBeenCalledWith(dashboard, undefined, 60 * 60 * 24);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('copies dashboard link without expiration when never is selected', async () => {
    const onDismiss = jest.fn();
    buildShareUrlWithExpirationMock.mockResolvedValue(undefined);
    const { dashboard } = setup();

    render(<CopyDashboardLinkModal dashboard={dashboard} onDismiss={onDismiss} />);

    await userEvent.click(screen.getByText('Never'));
    await userEvent.click(screen.getByRole('button', { name: 'Copy dashboard link' }));

    expect(buildShareUrlWithExpirationMock).toHaveBeenCalledWith(dashboard, undefined, 0);
  });
});

function setup() {
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
  });

  return { dashboard };
}
