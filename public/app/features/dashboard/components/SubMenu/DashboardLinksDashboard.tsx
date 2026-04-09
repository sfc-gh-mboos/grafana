import { css, cx } from '@emotion/css';
import { forwardRef, useEffect } from 'react';
import { useAsyncRetry } from 'react-use';

import { GrafanaTheme2, ScopedVars } from '@grafana/data';
import { sanitize, sanitizeUrl } from '@grafana/data/internal';
import { selectors } from '@grafana/e2e-selectors';
import { t } from '@grafana/i18n';
import { DashboardLink } from '@grafana/schema';
import { Dropdown, Icon, LinkButton, Button, Menu, ScrollContainer, useStyles2, Tooltip } from '@grafana/ui';
import { ButtonLinkProps } from '@grafana/ui/internal';
import { useAppNotification } from 'app/core/copy/appNotification';
import { getGrafanaSearcher } from 'app/features/search/service/searcher';
import { DashboardQueryResult } from 'app/features/search/service/types';

import { getLinkSrv } from '../../../panel/panellinks/link_srv';

interface Props {
  link: DashboardLink;
  linkInfo: { title: string };
  dashboardUID: string;
  scopedVars?: ScopedVars;
}

interface DashboardLinksMenuProps {
  link: DashboardLink;
  dashboardUID: string;
}

function DashboardLinksMenu({ dashboardUID, link }: DashboardLinksMenuProps) {
  const styles = useStyles2(getStyles);
  const { links: resolvedLinks, error, loading, retry } = useResolvedLinks({ dashboardUID, link });

  if (loading) {
    return (
      <Menu>
        <Menu.Item disabled label={t('dashboard.dashboard-links-menu.loading', 'Loading...')} />
      </Menu>
    );
  }

  if (error) {
    return (
      <Menu>
        <Menu.Item
          icon="exclamation-triangle"
          label={t('dashboard.dashboard-links-menu.error', 'Failed to load links')}
          onClick={retry}
        />
      </Menu>
    );
  }

  if (!resolvedLinks || resolvedLinks.length === 0) {
    return (
      <Menu>
        <Menu.Item
          disabled
          label={t('dashboard.dashboard-links-menu.label-no-dashboards-found', 'No dashboards found')}
        />
      </Menu>
    );
  }

  return (
    <Menu>
      <div className={styles.dropdown}>
        <ScrollContainer maxHeight="inherit">
          {resolvedLinks.map((resolvedLink, index) => {
            return (
              <Menu.Item
                url={resolvedLink.url}
                target={link.targetBlank ? '_blank' : undefined}
                key={`dashlinks-dropdown-item-${resolvedLink.uid}-${index}`}
                label={resolvedLink.title}
                testId={selectors.components.DashboardLinks.link}
                aria-label={t(
                  'dashboard.dashboard-links-menu.aria-label-dashboard-name',
                  '{{dashboardName}} dashboard',
                  { dashboardName: resolvedLink.title }
                )}
              />
            );
          })}
        </ScrollContainer>
      </div>
    </Menu>
  );
}

export const DashboardLinksDashboard = ({ link, linkInfo, dashboardUID }: Props) => {
  const { title } = linkInfo;
  const { links: resolvedLinks, error, loading, retry } = useResolvedLinks({ link, dashboardUID });
  const styles = useStyles2(getStyles);

  if (link.asDropdown) {
    return (
      <div className={styles.linkContainer}>
        <Dropdown overlay={<DashboardLinksMenu link={link} dashboardUID={dashboardUID} />}>
          <DashboardLinkButton
            data-placement="bottom"
            data-toggle="dropdown"
            aria-controls="dropdown-list"
            aria-haspopup="menu"
            fill="outline"
            variant="secondary"
            data-testid={selectors.components.DashboardLinks.dropDown}
          >
            <Icon aria-hidden name="bars" className={styles.iconMargin} />
            <span>{title}</span>
          </DashboardLinkButton>
        </Dropdown>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.linkContainer}>
        <Tooltip content={t('dashboard.dashboard-links.retry-tooltip', 'Click to retry loading dashboard links')}>
          <DashboardLinkButton
            icon="exclamation-triangle"
            variant="secondary"
            fill="outline"
            onClick={retry}
            data-testid={selectors.components.DashboardLinks.link}
          >
            {t('dashboard.dashboard-links.error-button', 'Error loading links')}
          </DashboardLinkButton>
        </Tooltip>
      </div>
    );
  }

  return (
    <>
      {resolvedLinks.length > 0 &&
        resolvedLinks.map((resolvedLink, index) => {
          return (
            <div key={`dashlinks-list-item-${resolvedLink.uid}-${index}`} className={styles.linkContainer}>
              <DashboardLinkButton
                icon="apps"
                variant="secondary"
                fill="outline"
                href={resolvedLink.url}
                target={link.targetBlank ? '_blank' : undefined}
                rel="noreferrer"
                data-testid={selectors.components.DashboardLinks.link}
              >
                {resolvedLink.title}
              </DashboardLinkButton>
            </div>
          );
        })}
    </>
  );
};

interface UseResolvedLinksResult {
  links: ResolvedLinkDTO[];
  error: Error | undefined;
  loading: boolean;
  retry: () => void;
}

const useResolvedLinks = ({ link, dashboardUID }: Pick<Props, 'link' | 'dashboardUID'>): UseResolvedLinksResult => {
  const { tags } = link;
  const notifyApp = useAppNotification();
  const result = useAsyncRetry(() => searchForTags(tags), [tags]);

  useEffect(() => {
    if (result.error) {
      notifyApp.error(
        t('dashboard.dashboard-links.error-title', 'Failed to load dashboard links'),
        result.error.message
      );
    }
  }, [result.error, notifyApp]);

  if (!result.value) {
    return { links: [], error: result.error, loading: result.loading, retry: result.retry };
  }
  return {
    links: resolveLinks(dashboardUID, link, result.value.view),
    error: result.error,
    loading: result.loading,
    retry: result.retry,
  };
};

interface ResolvedLinkDTO {
  uid: string;
  url: string;
  title: string;
}

export async function searchForTags(tags: string[]) {
  return getGrafanaSearcher().search({ limit: 100, tags, kind: ['dashboard'] });
}

export function resolveLinks(
  dashboardUID: string,
  link: DashboardLink,
  searchHits: DashboardQueryResult[],
  dependencies: { getLinkSrv: typeof getLinkSrv; sanitize: typeof sanitize; sanitizeUrl: typeof sanitizeUrl } = {
    getLinkSrv,
    sanitize,
    sanitizeUrl,
  }
): ResolvedLinkDTO[] {
  const hits: ResolvedLinkDTO[] = [];
  for (const searchHit of searchHits) {
    if (searchHit.uid === dashboardUID) {
      continue;
    }
    const uid = searchHit.uid;
    const title = dependencies.sanitize(searchHit.name);
    const resolvedLink = dependencies.getLinkSrv().getLinkUrl({ ...link, url: searchHit.url });
    const url = dependencies.sanitizeUrl(resolvedLink);
    hits.push({ uid, title, url });
  }
  return hits;
}

function getStyles(theme: GrafanaTheme2) {
  return {
    iconMargin: css({
      marginRight: theme.spacing(0.5),
    }),
    dropdown: css({
      maxWidth: 'max(30vw, 300px)',
      maxHeight: '70vh',
    }),
    button: css({
      color: theme.colors.text.primary,
    }),
    dashButton: css({
      fontSize: theme.typography.bodySmall.fontSize,
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
    }),
    linkContainer: css({
      display: 'inline-flex',
      alignItems: 'center',
      verticalAlign: 'middle',
    }),
  };
}

export const DashboardLinkButton = forwardRef<unknown, ButtonLinkProps>(({ className, ...otherProps }, ref) => {
  const styles = useStyles2(getStyles);
  const Component = otherProps.href ? LinkButton : Button;
  return (
    <Component
      {...otherProps}
      variant="secondary"
      fill="outline"
      className={cx(className, styles.dashButton)}
      ref={ref as any}
    />
  );
});

DashboardLinkButton.displayName = 'DashboardLinkButton';
