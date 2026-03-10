import { css } from '@emotion/css';
import { MouseEvent } from 'react';

import { GrafanaTheme2, NavModelItem } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { EmptyState, IconButton, useStyles2 } from '@grafana/ui';
import { usePinnedItems } from 'app/core/components/AppChrome/MegaMenu/hooks';
import { findByUrl } from 'app/core/components/AppChrome/MegaMenu/utils';
import { NavLandingPageCard } from 'app/core/components/NavLandingPage/NavLandingPageCard';
import { Page } from 'app/core/components/Page/Page';
import { createSuccessNotification } from 'app/core/copy/appNotification';
import { notifyApp } from 'app/core/reducers/appNotification';
import { isDashboardLink, toAbsoluteGrafanaUrl } from 'app/core/utils/dashboardLinks';
import { copyStringToClipboard } from 'app/core/utils/explore';
import { useDispatch, useSelector } from 'app/types/store';

export function BookmarksPage() {
  const styles = useStyles2(getStyles);
  const pinnedItems = usePinnedItems();
  const navTree = useSelector((state) => state.navBarTree);
  const dispatch = useDispatch();

  const validItems = pinnedItems.reduce((acc: NavModelItem[], url) => {
    const item = findByUrl(navTree, url);
    if (item) {
      acc.push(item);
    }
    return acc;
  }, []);

  const onCopyDashboardLink = (event: MouseEvent, url: string) => {
    event.preventDefault();
    event.stopPropagation();
    copyStringToClipboard(toAbsoluteGrafanaUrl(url));
    dispatch(
      notifyApp(createSuccessNotification(t('bookmarks-page.copy-link.success', 'Dashboard link copied to clipboard')))
    );
  };

  return (
    <Page navId="bookmarks">
      <Page.Contents>
        {validItems.length === 0 ? (
          <EmptyState
            variant="call-to-action"
            message={t('bookmarks-page.empty.message', 'It looks like you haven’t created any bookmarks yet')}
          >
            <Trans i18nKey="bookmarks-page.empty.tip">
              Hover over any item in the nav menu and click on the bookmark icon to add it here.
            </Trans>
          </EmptyState>
        ) : (
          <section className={styles.grid}>
            {validItems.map((item) => {
              return (
                <div key={item.id || item.url} className={styles.cardWrapper}>
                  <NavLandingPageCard description={item.subTitle} text={item.text} url={item.url ?? ''} />
                  {item.url && isDashboardLink(item.url) && (
                    <IconButton
                      name="copy"
                      className={styles.copyButton}
                      tooltip={t('bookmarks-page.copy-link.tooltip', 'Copy dashboard link')}
                      aria-label={t('bookmarks-page.copy-link.aria-label', 'Copy dashboard link')}
                      onClick={(event) => onCopyDashboardLink(event, item.url!)}
                    />
                  )}
                </div>
              );
            })}
          </section>
        )}
      </Page.Contents>
    </Page>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  grid: css({
    display: 'grid',
    gap: theme.spacing(3),
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gridAutoRows: '138px',
    padding: theme.spacing(2, 0),
  }),
  cardWrapper: css({
    position: 'relative',
  }),
  copyButton: css({
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    zIndex: 1,
  }),
});

export default BookmarksPage;
