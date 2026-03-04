import { css } from '@emotion/css';
import { useMemo, useState } from 'react';

import { GrafanaTheme2, NavModelItem, SelectableValue } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { EmptyState, FilterInput, MultiSelect, TagList, useStyles2 } from '@grafana/ui';
import {
  BookmarkPreferenceItem,
  withDerivedBookmarkMetadata,
} from 'app/core/components/AppChrome/MegaMenu/bookmarks';
import { usePinnedItems } from 'app/core/components/AppChrome/MegaMenu/hooks';
import { findByUrl } from 'app/core/components/AppChrome/MegaMenu/utils';
import { NavLandingPageCard } from 'app/core/components/NavLandingPage/NavLandingPageCard';
import { Page } from 'app/core/components/Page/Page';
import { useSelector } from 'app/types/store';

interface BookmarkedNavItem {
  item: NavModelItem;
  metadata: BookmarkPreferenceItem;
  category: string;
  tags: string[];
}

export function BookmarksPage() {
  const styles = useStyles2(getStyles);
  const pinnedItems = usePinnedItems();
  const navTree = useSelector((state) => state.navBarTree);
  const uncategorizedLabel = t('bookmarks-page.filters.uncategorized', 'Uncategorized');
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilters, setCategoryFilters] = useState<Array<SelectableValue<string>>>([]);
  const [tagFilters, setTagFilters] = useState<Array<SelectableValue<string>>>([]);
  const collator = useMemo(() => new Intl.Collator(undefined, { sensitivity: 'base' }), []);

  const validItems = useMemo(() => {
    return pinnedItems.reduce((acc: BookmarkedNavItem[], bookmark) => {
      const item = findByUrl(navTree, bookmark.url);
      if (!item) {
        return acc;
      }

      const metadata = withDerivedBookmarkMetadata(bookmark, item);
      acc.push({
        item,
        metadata,
        category: metadata.category ?? uncategorizedLabel,
        tags: metadata.tags ?? [],
      });
      return acc;
    }, []);
  }, [navTree, pinnedItems, uncategorizedLabel]);

  const categoryOptions = useMemo<Array<SelectableValue<string>>>(() => {
    const categoryNames = Array.from(new Set(validItems.map((bookmark) => bookmark.category)));
    return categoryNames.sort((a, b) => collator.compare(a, b)).map((category) => ({ label: category, value: category }));
  }, [collator, validItems]);

  const tagOptions = useMemo<Array<SelectableValue<string>>>(() => {
    const tags = new Set<string>();
    for (const bookmark of validItems) {
      for (const tag of bookmark.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags)
      .sort((a, b) => collator.compare(a, b))
      .map((tag) => ({ label: tag, value: tag }));
  }, [collator, validItems]);

  const searchTerm = searchValue.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    const activeCategories = categoryFilters.map((option) => option.value).filter((value): value is string => Boolean(value));
    const activeTags = tagFilters.map((option) => option.value).filter((value): value is string => Boolean(value));

    return validItems.filter((bookmark) => {
      const categoryMatch = activeCategories.length === 0 || activeCategories.includes(bookmark.category);
      const tagsMatch = activeTags.length === 0 || activeTags.some((tag) => bookmark.tags.includes(tag));
      if (!categoryMatch || !tagsMatch) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const searchableText = [
        bookmark.item.text,
        bookmark.item.subTitle,
        bookmark.item.url,
        bookmark.category,
        ...bookmark.tags,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchableText.includes(searchTerm);
    });
  }, [categoryFilters, tagFilters, searchTerm, validItems]);

  const groupedItems = useMemo(() => {
    const grouped = new Map<string, BookmarkedNavItem[]>();
    for (const bookmark of filteredItems) {
      const group = grouped.get(bookmark.category) ?? [];
      group.push(bookmark);
      grouped.set(bookmark.category, group);
    }

    return Array.from(grouped.entries()).sort(([leftCategory], [rightCategory]) =>
      collator.compare(leftCategory, rightCategory)
    );
  }, [collator, filteredItems]);

  const onCategoryFiltersChange = (options: Array<SelectableValue<string>>) => {
    setCategoryFilters(options);
  };

  const onTagFiltersChange = (options: Array<SelectableValue<string>>) => {
    setTagFilters(options);
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
          <div className={styles.content}>
            <section className={styles.filters}>
              <FilterInput
                placeholder={t('bookmarks-page.filters.search.placeholder', 'Search bookmarks')}
                value={searchValue}
                onChange={setSearchValue}
              />
              <MultiSelect
                className={styles.filterSelect}
                options={categoryOptions}
                value={categoryFilters}
                placeholder={t('bookmarks-page.filters.category.placeholder', 'Filter by category')}
                aria-label={t('bookmarks-page.filters.category.aria-label', 'Filter bookmarks by category')}
                onChange={onCategoryFiltersChange}
              />
              <MultiSelect
                className={styles.filterSelect}
                options={tagOptions}
                value={tagFilters}
                placeholder={t('bookmarks-page.filters.tags.placeholder', 'Filter by tags')}
                aria-label={t('bookmarks-page.filters.tags.aria-label', 'Filter bookmarks by tags')}
                onChange={onTagFiltersChange}
              />
            </section>

            {filteredItems.length === 0 ? (
              <EmptyState
                variant="not-found"
                message={t('bookmarks-page.empty.filtered.message', 'No bookmarks match the selected filters')}
              />
            ) : (
              groupedItems.map(([category, bookmarks]) => (
                <section key={category} className={styles.group}>
                  <header className={styles.groupHeader}>
                    <h2 className={styles.groupTitle}>{category}</h2>
                    <span className={styles.groupCount}>
                      {t('bookmarks-page.group.count', '{{count}} bookmarks', { count: bookmarks.length })}
                    </span>
                  </header>
                  <div className={styles.grid}>
                    {bookmarks.map(({ item, metadata, tags }) => (
                      <div key={item.id || item.url} className={styles.cardWrapper}>
                        <NavLandingPageCard description={item.subTitle} text={item.text} url={item.url ?? ''} />
                        {tags.length > 0 && (
                          <div className={styles.tagListWrapper}>
                            <TagList tags={metadata.tags ?? []} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        )}
      </Page.Contents>
    </Page>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  content: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    padding: theme.spacing(2, 0),
  }),
  filters: css({
    display: 'grid',
    gap: theme.spacing(1),
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  }),
  filterSelect: css({
    minWidth: 0,
  }),
  group: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
  }),
  groupHeader: css({
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
  }),
  groupTitle: css({
    margin: 0,
    fontSize: theme.typography.h5.fontSize,
  }),
  groupCount: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  grid: css({
    display: 'grid',
    gap: theme.spacing(3),
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gridAutoRows: 'minmax(138px, auto)',
  }),
  cardWrapper: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
    minWidth: 0,
  }),
  tagListWrapper: css({
    marginLeft: theme.spacing(0.25),
  }),
});

export default BookmarksPage;
