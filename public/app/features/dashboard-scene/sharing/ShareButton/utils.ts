import { store } from '@grafana/data';
import { VizPanel } from '@grafana/scenes';
import { createAndCopyShareDashboardLink } from 'app/core/utils/shortLinks';
import { getTrackingSource } from 'app/features/dashboard/components/ShareModal/utils';

import { DashboardScene } from '../../scene/DashboardScene';
import { DashboardInteractions } from '../../utils/interactions';

export type ShareDashboardLinkExpiration = '1h' | '24h' | '7d' | 'never';

export type ShareLinkConfiguration = {
  useAbsoluteTimeRange: boolean;
  useShortUrl: boolean;
  theme: string;
};

const DEFAULT_SHARE_LINK_CONFIGURATION: ShareLinkConfiguration = {
  useAbsoluteTimeRange: true,
  useShortUrl: true,
  theme: 'current',
};

export function getShareExpirationTimestamp(option: ShareDashboardLinkExpiration): number | undefined {
  const now = Date.now();

  switch (option) {
    case '1h':
      return Math.floor((now + 60 * 60 * 1000) / 1000);
    case '24h':
      return Math.floor((now + 24 * 60 * 60 * 1000) / 1000);
    case '7d':
      return Math.floor((now + 7 * 24 * 60 * 60 * 1000) / 1000);
    case 'never':
      return undefined;
  }
}

export const buildShareUrl = async (
  dashboard: DashboardScene,
  panel?: VizPanel,
  expiration?: ShareDashboardLinkExpiration
) => {
  const { useAbsoluteTimeRange, useShortUrl, theme } = getShareLinkConfiguration();
  DashboardInteractions.shareLinkCopied({
    currentTimeRange: useAbsoluteTimeRange,
    theme,
    shortenURL: useShortUrl,
    shareResource: getTrackingSource(panel?.getRef()),
  });
  return await createAndCopyShareDashboardLink(dashboard, {
    useAbsoluteTimeRange,
    theme,
    useShortUrl,
  }, panel, { expiresAt: expiration ? getShareExpirationTimestamp(expiration) : undefined });
};

const SHARE_LINK_CONFIGURATION = 'grafana.dashboard.link.shareConfiguration';
// Function that returns share link configuration from local storage
export function getShareLinkConfiguration(): ShareLinkConfiguration {
  if (store.exists(SHARE_LINK_CONFIGURATION)) {
    return store.getObject(SHARE_LINK_CONFIGURATION) || DEFAULT_SHARE_LINK_CONFIGURATION;
  }

  return DEFAULT_SHARE_LINK_CONFIGURATION;
}

export function updateShareLinkConfiguration(config: ShareLinkConfiguration) {
  store.setObject(SHARE_LINK_CONFIGURATION, config);
}
