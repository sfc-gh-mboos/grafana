import { config } from '@grafana/runtime';

import { isDashboardLink, toAbsoluteGrafanaUrl } from './dashboardLinks';

describe('dashboardLinks', () => {
  const originalAppSubUrl = config.appSubUrl;

  afterEach(() => {
    config.appSubUrl = originalAppSubUrl;
  });

  describe('isDashboardLink', () => {
    it('returns true for relative dashboard URLs', () => {
      expect(isDashboardLink('/d/abc123/my-dashboard')).toBe(true);
    });

    it('returns true for absolute dashboard URLs', () => {
      expect(isDashboardLink('https://grafana.example.com/grafana/d/abc123/my-dashboard')).toBe(true);
    });

    it('returns false for non-dashboard URLs', () => {
      expect(isDashboardLink('/dashboards')).toBe(false);
    });
  });

  describe('toAbsoluteGrafanaUrl', () => {
    it('keeps absolute URLs unchanged', () => {
      const url = 'https://grafana.example.com/d/abc123/my-dashboard';
      expect(toAbsoluteGrafanaUrl(url)).toBe(url);
    });

    it('prepends origin and appSubUrl for relative URLs', () => {
      config.appSubUrl = '/grafana';
      expect(toAbsoluteGrafanaUrl('/d/abc123/my-dashboard')).toBe(
        `${window.location.origin}/grafana/d/abc123/my-dashboard`
      );
    });

    it('does not duplicate appSubUrl when it is already present', () => {
      config.appSubUrl = '/grafana';
      expect(toAbsoluteGrafanaUrl('/grafana/d/abc123/my-dashboard')).toBe(
        `${window.location.origin}/grafana/d/abc123/my-dashboard`
      );
    });
  });
});
