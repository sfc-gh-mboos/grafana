import { store } from '@grafana/data';
import { VizPanel } from '@grafana/scenes';
import { createAndCopyShareDashboardLink, getShortLinkUID, revokeShortLink } from 'app/core/utils/shortLinks';
import { getTrackingSource } from 'app/features/dashboard/components/ShareModal/utils';

import { DashboardScene } from '../../scene/DashboardScene';
import { DashboardInteractions } from '../../utils/interactions';

export type ShareLinkConfiguration = {
  useAbsoluteTimeRange: boolean;
  useShortUrl: boolean;
  theme: string;
  shortLinkExpiresInSeconds?: number;
};

const DEFAULT_SHARE_LINK_CONFIGURATION: ShareLinkConfiguration = {
  useAbsoluteTimeRange: true,
  useShortUrl: true,
  theme: 'current',
};

const LAST_COPIED_DASHBOARD_SHORT_LINK = 'grafana.dashboard.link.lastCopiedShortLink';

export const buildShareUrl = async (dashboard: DashboardScene, panel?: VizPanel) => {
  return await buildShareUrlWithExpiration(dashboard, panel, undefined);
};

export const buildShareUrlWithExpiration = async (
  dashboard: DashboardScene,
  panel?: VizPanel,
  shortLinkExpiresInSeconds?: number
) => {
  const { useAbsoluteTimeRange, theme } = getShareLinkConfiguration();
  // This modal always generates a short link so it can be revoked/invalidated.
  const useShortUrl = true;
  DashboardInteractions.shareLinkCopied({
    currentTimeRange: useAbsoluteTimeRange,
    theme,
    shortenURL: useShortUrl,
    shareResource: getTrackingSource(panel?.getRef()),
  });
  const copiedLink = await createAndCopyShareDashboardLink(dashboard, {
    useAbsoluteTimeRange,
    theme,
    useShortUrl,
    shortLinkExpiresInSeconds,
  });

  if (copiedLink && getShortLinkUID(copiedLink)) {
    store.set(LAST_COPIED_DASHBOARD_SHORT_LINK, copiedLink);
  }

  return copiedLink;
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

export function getLastCopiedDashboardShortLink(): string | undefined {
  const lastCopiedLink = store.get(LAST_COPIED_DASHBOARD_SHORT_LINK);
  if (typeof lastCopiedLink !== 'string') {
    return undefined;
  }

  return getShortLinkUID(lastCopiedLink) ? lastCopiedLink : undefined;
}

export function clearLastCopiedDashboardShortLink() {
  store.delete(LAST_COPIED_DASHBOARD_SHORT_LINK);
}

export async function revokeDashboardShareLink(shortLinkUrl: string): Promise<void> {
  await revokeShortLink(shortLinkUrl);
  clearLastCopiedDashboardShortLink();
}
