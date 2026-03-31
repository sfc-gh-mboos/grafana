import memoizeOne from 'memoize-one';

import { AbsoluteTimeRange, LogRowModel, UrlQueryMap } from '@grafana/data';
import { t } from '@grafana/i18n';
import { getBackendSrv, config, locationService } from '@grafana/runtime';
import { sceneGraph, SceneTimeRangeLike, VizPanel } from '@grafana/scenes';
import { shortURLAPIv1beta1 } from 'app/api/clients/shorturl/v1beta1';
import { createErrorNotification, createSuccessNotification } from 'app/core/copy/appNotification';
import { DashboardScene } from 'app/features/dashboard-scene/scene/DashboardScene';
import { getDashboardUrl } from 'app/features/dashboard-scene/utils/getDashboardUrl';
import { dispatch } from 'app/store/store';

import { ShortURL } from '../../../../apps/shorturl/plugin/src/generated/shorturl/v1beta1/shorturl_object_gen';
import { extractErrorMessage } from '../../api/utils';
import { ShareLinkConfiguration } from '../../features/dashboard-scene/sharing/ShareButton/utils';
import { notifyApp } from '../reducers/appNotification';

import { copyStringToClipboard } from './explore';

const SHORT_URL_TTL_SECONDS_ANNOTATION = 'shorturl.grafana.app/ttlSeconds';

const clearCreateShortLinkCache = () => {
  const clearFn = Reflect.get(createShortLink, 'clear');
  if (typeof clearFn === 'function') {
    clearFn();
  }
};

function buildHostUrl() {
  return `${window.location.protocol}//${window.location.host}${config.appSubUrl}`;
}

export function buildShortUrl(k8sShortUrl: ShortURL) {
  const key = k8sShortUrl.metadata.name;
  const orgId = k8sShortUrl.metadata.namespace;
  const hostUrl = buildHostUrl();
  return `${hostUrl}/goto/${key}?orgId=${orgId}`;
}

function getRelativeURLPath(url: string) {
  let path = url.replace(buildHostUrl(), '');
  return path.startsWith('/') ? path.substring(1, path.length) : path;
}

const createShortLinkLegacy = async (path: string, expiresInSeconds?: number): Promise<string> => {
  const payload: { path: string; expiresInSeconds?: number } = {
    path: getRelativeURLPath(path),
  };
  if (expiresInSeconds && expiresInSeconds > 0) {
    payload.expiresInSeconds = expiresInSeconds;
  }

  const shortLink = await getBackendSrv().post(`/api/short-urls`, payload);
  return shortLink.url;
};

// Memoized API call, to not re-execute the same request multiple times
// this function creates a shortURL using the legacy or the new k8s api depending on the feature toggle
export const createShortLink = memoizeOne(async (path: string, expiresInSeconds?: number): Promise<string> => {
  try {
    if (config.featureToggles.useKubernetesShortURLsAPI) {
      const metadata: { annotations?: Record<string, string> } = {};
      if (expiresInSeconds && expiresInSeconds > 0) {
        metadata.annotations = {
          [SHORT_URL_TTL_SECONDS_ANNOTATION]: String(expiresInSeconds),
        };
      }

      // Use RTK API - it handles caching/failures/retries automatically
      const result = await dispatch(
        shortURLAPIv1beta1.endpoints.createShortUrl.initiate({
          shortUrl: {
            apiVersion: 'shorturl.grafana.app/v1beta1',
            kind: 'ShortURL',
            metadata,
            spec: {
              path: getRelativeURLPath(path),
            },
          },
        })
      );

      if ('data' in result && result.data) {
        return buildShortUrl(result.data);
      }

      if ('error' in result) {
        const errorMessage = extractErrorMessage(result.error);
        throw new Error(errorMessage || 'Failed to create short URL');
      }

      throw new Error('Failed to create short URL');
    } else {
      return await createShortLinkLegacy(path, expiresInSeconds);
    }
  } catch (err) {
    console.error('Error when creating shortened link: ', err);
    dispatch(notifyApp(createErrorNotification('Error generating shortened link')));
    throw err; // Re-throw so callers know it failed
  }
});

/**
 * Creates a ClipboardItem for the shortened link. This is used due to clipboard issues in Safari after making async calls.
 * See https://github.com/grafana/grafana/issues/106889
 * @param path - The long path to share.
 * @returns A ClipboardItem for the shortened link.
 */
const createShortLinkClipboardItem = (shortLinkPromise: Promise<string>) => {
  return new ClipboardItem({
    'text/plain': shortLinkPromise,
  });
};

export const createAndCopyShortLink = async (
  path: string,
  expiresInSeconds?: number,
  forceNewShortUrl = false
) => {
  try {
    if (forceNewShortUrl) {
      clearCreateShortLinkCache();
    }

    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
      const shortLinkPromise = createShortLink(path, expiresInSeconds);
      await navigator.clipboard.write([createShortLinkClipboardItem(shortLinkPromise)]);
      const shortLink = await shortLinkPromise;
      dispatch(notifyApp(createSuccessNotification('Shortened link copied to clipboard')));
      return shortLink;
    } else {
      const shortLink = await createShortLink(path, expiresInSeconds);
      copyStringToClipboard(shortLink);
      dispatch(notifyApp(createSuccessNotification('Shortened link copied to clipboard')));
      return shortLink;
    }
  } catch (error) {
    // createShortLink already handles error notifications, just log
    console.error('Error in createAndCopyShortLink:', error);
    return undefined;
  }
};

export const createAndCopyShareDashboardLink = async (
  dashboard: DashboardScene,
  opts: ShareLinkConfiguration,
  panel?: VizPanel
) => {
  const shareUrl = createDashboardShareUrl(dashboard, opts, panel);
  if (opts.useShortUrl) {
    return await createAndCopyShortLink(shareUrl, opts.shortLinkExpiresInSeconds, opts.forceNewShortUrl);
  } else {
    copyStringToClipboard(shareUrl);
    dispatch(notifyApp(createSuccessNotification(t('link.share.copy-to-clipboard', 'Link copied to clipboard'))));
    return shareUrl;
  }
};

export const getShortLinkUID = (shortLinkUrl: string): string | undefined => {
  try {
    const parsedUrl = new URL(shortLinkUrl, buildHostUrl());
    const match = parsedUrl.pathname.match(/\/goto\/([^/]+)\/?$/);
    return match?.[1];
  } catch {
    return undefined;
  }
};

export const revokeShortLink = async (shortLinkUrl: string): Promise<void> => {
  const uid = getShortLinkUID(shortLinkUrl);
  if (!uid) {
    throw new Error('Invalid short link URL');
  }

  try {
    if (config.featureToggles.useKubernetesShortURLsAPI) {
      const result = await dispatch(
        shortURLAPIv1beta1.endpoints.deleteShortUrl.initiate({
          name: uid,
        })
      );

      if ('error' in result) {
        const errorMessage = extractErrorMessage(result.error);
        throw new Error(errorMessage || 'Failed to revoke short URL');
      }
    } else {
      await getBackendSrv().delete(`/api/short-urls/${uid}`);
    }

    dispatch(notifyApp(createSuccessNotification(t('dashboard.share.copy-link.revoked', 'Dashboard link revoked'))));
    clearCreateShortLinkCache();
  } catch (error) {
    const errorMessage =
      typeof error === 'string'
        ? error
        : error instanceof Error
          ? error.message
          : JSON.stringify(error ?? '');

    if (errorMessage.toLowerCase().includes('notfound') || errorMessage.includes('404')) {
      dispatch(
        notifyApp(
          createSuccessNotification(
            t('dashboard.share.copy-link.already-revoked', 'Dashboard link is already invalid')
          )
        )
      );
      clearCreateShortLinkCache();
      return;
    }

    dispatch(
      notifyApp(
        createErrorNotification(
          t('dashboard.share.copy-link.revoke-failed', 'Error revoking dashboard link')
        )
      )
    );
    throw error;
  }
};

export const createDashboardShareUrl = (dashboard: DashboardScene, opts: ShareLinkConfiguration, panel?: VizPanel) => {
  const location = locationService.getLocation();
  const timeRange = sceneGraph.getTimeRange(panel ?? dashboard);

  const urlParamsUpdate = getShareUrlParams(opts, timeRange, panel);

  return getDashboardUrl({
    uid: dashboard.state.uid,
    slug: dashboard.state.meta.slug,
    currentQueryParams: location.search,
    updateQuery: urlParamsUpdate,
    absolute: !opts.useShortUrl,
  });
};

export const getShareUrlParams = (
  opts: { useAbsoluteTimeRange: boolean; theme: string },
  timeRange: SceneTimeRangeLike,
  panel?: VizPanel
) => {
  const urlParamsUpdate: UrlQueryMap = {};

  if (panel) {
    urlParamsUpdate.viewPanel = panel.getPathId();
  }

  if (opts.useAbsoluteTimeRange) {
    urlParamsUpdate.from = timeRange.state.value.from.toISOString();
    urlParamsUpdate.to = timeRange.state.value.to.toISOString();
  }

  if (opts.theme !== 'current') {
    urlParamsUpdate.theme = opts.theme;
  }

  return urlParamsUpdate;
};

function getPreviousLog(row: LogRowModel, allLogs: LogRowModel[]): LogRowModel | null {
  for (let i = allLogs.indexOf(row) - 1; i >= 0; i--) {
    if (allLogs[i].timeEpochMs > row.timeEpochMs) {
      return allLogs[i];
    }
  }

  return null;
}

export function getLogsPermalinkRange(row: LogRowModel, rows: LogRowModel[], absoluteRange: AbsoluteTimeRange) {
  // With infinite scrolling, the time range of the log line can be after the absolute range or beyond the request line limit, so we need to adjust
  // Look for the previous sibling log, and use its timestamp
  const allLogs = rows.filter((logRow) => logRow.dataFrame.refId === row.dataFrame.refId);
  const prevLog = getPreviousLog(row, allLogs);

  if (row.timeEpochMs > absoluteRange.to && !prevLog) {
    // Because there's no sibling and the current `to` is oldest than the log, we have no reference we can use for the interval
    // This only happens when you scroll into the future and you want to share the first log of the list
    return {
      from: new Date(absoluteRange.from).toISOString(),
      // Slide 1ms otherwise it's very likely to be omitted in the results
      to: new Date(row.timeEpochMs + 1).toISOString(),
    };
  }

  return {
    from: new Date(absoluteRange.from).toISOString(),
    to: new Date(prevLog ? prevLog.timeEpochMs : absoluteRange.to).toISOString(),
  };
}
