import { config } from '@grafana/runtime';

const DASHBOARD_LINK_REGEX = /\/d\/[^/]+/;

export function isDashboardLink(url: string): boolean {
  if (!url) {
    return false;
  }

  try {
    const { pathname } = new URL(url, window.location.origin);
    return DASHBOARD_LINK_REGEX.test(pathname);
  } catch {
    return false;
  }
}

export function toAbsoluteGrafanaUrl(url: string): string {
  if (!url) {
    return window.location.href;
  }

  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(url)) {
    return url;
  }

  const origin = window.location.origin;
  const appSubUrl = config.appSubUrl ?? '';

  if (url.startsWith('/')) {
    if (appSubUrl && url.startsWith(`${appSubUrl}/`)) {
      return `${origin}${url}`;
    }

    return `${origin}${appSubUrl}${url}`;
  }

  return `${origin}/${url}`;
}
