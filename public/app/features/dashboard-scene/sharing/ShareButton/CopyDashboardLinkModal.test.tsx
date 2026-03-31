import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SceneTimeRange, VizPanel } from '@grafana/scenes';

import { DashboardScene } from '../../scene/DashboardScene';
import { DefaultGridLayoutManager } from '../../scene/layout-default/DefaultGridLayoutManager';

import { CopyDashboardLinkModal } from './CopyDashboardLinkModal';
import { buildShareUrlWithExpiration, getLastCopiedDashboardShortLink, revokeDashboardShareLink } from './utils';

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  buildShareUrlWithExpiration: jest.fn(),
  getLastCopiedDashboardShortLink: jest.fn(),
  revokeDashboardShareLink: jest.fn(),
}));

const buildShareUrlWithExpirationMock = jest.mocked(buildShareUrlWithExpiration);
const getLastCopiedDashboardShortLinkMock = jest.mocked(getLastCopiedDashboardShortLink);
const revokeDashboardShareLinkMock = jest.mocked(revokeDashboardShareLink);

describe('CopyDashboardLinkModal', () => {
  beforeEach(() => {
    buildShareUrlWithExpirationMock.mockReset();
    getLastCopiedDashboardShortLinkMock.mockReset();
    revokeDashboardShareLinkMock.mockReset();
    getLastCopiedDashboardShortLinkMock.mockReturnValue(undefined);
  });

  it('copies dashboard link with default expiration', async () => {
    const onDismiss = jest.fn();
    buildShareUrlWithExpirationMock.mockResolvedValue('http://localhost:3000/goto/abc123?orgId=1');
    const { dashboard } = setup();

    render(<CopyDashboardLinkModal dashboard={dashboard} onDismiss={onDismiss} />);

    await userEvent.click(screen.getByRole('button', { name: 'Copy dashboard link' }));

    expect(buildShareUrlWithExpirationMock).toHaveBeenCalledWith(dashboard, undefined, 60 * 60 * 24);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(await screen.findByDisplayValue('http://localhost:3000/goto/abc123?orgId=1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoke current link now' })).toBeEnabled();
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

  it('loads and revokes an existing copied dashboard link', async () => {
    const { dashboard } = setup();
    getLastCopiedDashboardShortLinkMock.mockReturnValue('http://localhost:3000/goto/abc123?orgId=1');
    revokeDashboardShareLinkMock.mockResolvedValue(undefined);

    render(<CopyDashboardLinkModal dashboard={dashboard} onDismiss={jest.fn()} />);

    expect(screen.getByDisplayValue('http://localhost:3000/goto/abc123?orgId=1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Revoke current link now' }));

    expect(revokeDashboardShareLinkMock).toHaveBeenCalledWith('http://localhost:3000/goto/abc123?orgId=1');
    expect(screen.queryByDisplayValue('http://localhost:3000/goto/abc123?orgId=1')).not.toBeInTheDocument();
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
