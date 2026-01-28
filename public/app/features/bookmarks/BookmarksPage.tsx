import { css, cx } from '@emotion/css';
import { useMemo, useState } from 'react';

import { GrafanaTheme2, NavModelItem, SelectableValue } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { CollapsableSection, EmptyState, FilterInput, Select, Stack, useStyles2 } from '@grafana/ui';
import { usePinnedItems } from 'app/core/components/AppChrome/MegaMenu/hooks';
import { findByUrl } from 'app/core/components/AppChrome/MegaMenu/utils';
import { NavLandingPageCard } from 'app/core/components/NavLandingPage/NavLandingPageCard';
import { Page } from 'app/core/components/Page/Page';
import { useSelector } from 'app/types/store';

// Category definitions with display properties
const CATEGORIES = {
  operations: {
    label: 'Operations',
    description: 'Monitoring, alerting, and observability tools',
    colorStyle: 'warning' as const,
  },
  admin: {
    label: 'Admin',
    description: 'Configuration and administration',
    colorStyle: 'error' as const,
  },
  content: {
    label: 'Content',
    description: 'Dashboards, folders, and visualizations',
    colorStyle: 'primary' as const,
  },
  explore: {
    label: 'Explore',
    description: 'Data exploration and analysis',
    colorStyle: 'success' as const,
  },
  other: {
    label: 'Other',
    description: 'Other bookmarked items',
    colorStyle: 'secondary' as const,
  },
} as const;

type CategoryKey = keyof typeof CATEGORIES;

// Ordered list of category keys for consistent rendering
const CATEGORY_KEYS: CategoryKey[] = ['operations', 'admin', 'content', 'explore', 'other'];

// URL patterns for auto-categorization
const CATEGORY_PATTERNS: Array<{ pattern: RegExp; category: CategoryKey }> = [
  // Operations - monitoring and alerting
  { pattern: /^\/alerting/, category: 'operations' },
  { pattern: /^\/a\/grafana-incident-app/, category: 'operations' },
  { pattern: /^\/a\/grafana-oncall-app/, category: 'operations' },
  { pattern: /^\/a\/grafana-slo-app/, category: 'operations' },
  { pattern: /^\/connections/, category: 'operations' },
  { pattern: /^\/datasources/, category: 'operations' },

  // Admin - configuration and administration
  { pattern: /^\/admin/, category: 'admin' },
  { pattern: /^\/org/, category: 'admin' },
  { pattern: /^\/plugins/, category: 'admin' },
  { pattern: /^\/serviceaccounts/, category: 'admin' },
  { pattern: /^\/apikeys/, category: 'admin' },

  // Content - dashboards and visualizations
  { pattern: /^\/d\//, category: 'content' },
  { pattern: /^\/dashboards/, category: 'content' },
  { pattern: /^\/library-panels/, category: 'content' },
  { pattern: /^\/playlists/, category: 'content' },
  { pattern: /^\/snapshots/, category: 'content' },

  // Explore - data exploration
  { pattern: /^\/explore/, category: 'explore' },
  { pattern: /^\/a\/grafana-lokiexplore-app/, category: 'explore' },
  { pattern: /^\/a\/grafana-pyroscope-app/, category: 'explore' },
];

// Categorize a nav item based on its URL
function categorizeItem(item: NavModelItem): CategoryKey {
  const url = item.url || '';

  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (pattern.test(url)) {
      return category;
    }
  }

  return 'other';
}

interface CategorizedItem extends NavModelItem {
  category: CategoryKey;
}

export function BookmarksPage() {
  const styles = useStyles2(getStyles);
  const pinnedItems = usePinnedItems();
  const navTree = useSelector((state) => state.navBarTree);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SelectableValue<CategoryKey | 'all'>>({
    label: t('bookmarks-page.filter.all-categories', 'All categories'),
    value: 'all',
  });
  const [expandedSections, setExpandedSections] = useState<Record<CategoryKey, boolean>>({
    operations: true,
    admin: true,
    content: true,
    explore: true,
    other: true,
  });

  // Build categorized items from pinned URLs
  const categorizedItems = useMemo(() => {
    return pinnedItems.reduce((acc: CategorizedItem[], url) => {
      const item = findByUrl(navTree, url);
      if (item) {
        acc.push({
          ...item,
          category: categorizeItem(item),
        });
      }
      return acc;
    }, []);
  }, [pinnedItems, navTree]);

  // Filter items by search query and category
  const filteredItems = useMemo(() => {
    return categorizedItems.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subTitle?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory.value === 'all' || item.category === selectedCategory.value;

      return matchesSearch && matchesCategory;
    });
  }, [categorizedItems, searchQuery, selectedCategory.value]);

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: Record<CategoryKey, CategorizedItem[]> = {
      operations: [],
      admin: [],
      content: [],
      explore: [],
      other: [],
    };

    for (const item of filteredItems) {
      groups[item.category].push(item);
    }

    return groups;
  }, [filteredItems]);

  // Category options for the filter
  const categoryOptions: Array<SelectableValue<CategoryKey | 'all'>> = [
    { label: t('bookmarks-page.filter.all-categories', 'All categories'), value: 'all' },
    { label: CATEGORIES.operations.label, value: 'operations' },
    { label: CATEGORIES.admin.label, value: 'admin' },
    { label: CATEGORIES.content.label, value: 'content' },
    { label: CATEGORIES.explore.label, value: 'explore' },
    { label: CATEGORIES.other.label, value: 'other' },
  ];

  const toggleSection = (category: CategoryKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const hasBookmarks = categorizedItems.length > 0;
  const hasFilteredResults = filteredItems.length > 0;

  return (
    <Page navId="bookmarks">
      <Page.Contents>
        {!hasBookmarks ? (
          <EmptyState
            variant="call-to-action"
            message={t('bookmarks-page.empty.message', "It looks like you haven't created any bookmarks yet")}
          >
            <Trans i18nKey="bookmarks-page.empty.tip">
              Hover over any item in the nav menu and click on the bookmark icon to add it here.
            </Trans>
          </EmptyState>
        ) : (
          <Stack direction="column" gap={2}>
            {/* Filter bar */}
            <div className={styles.filterBar}>
              <div className={styles.filterInput}>
                <FilterInput
                  placeholder={t('bookmarks-page.filter.search-placeholder', 'Search bookmarks...')}
                  value={searchQuery}
                  onChange={setSearchQuery}
                />
              </div>
              <div className={styles.categorySelect}>
                <Select
                  options={categoryOptions}
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  aria-label={t('bookmarks-page.filter.category-label', 'Filter by category')}
                />
              </div>
            </div>

            {!hasFilteredResults ? (
              <EmptyState variant="not-found" message={t('bookmarks-page.no-results.message', 'No bookmarks found')} />
            ) : (
              <div className={styles.categoriesContainer}>
                {CATEGORY_KEYS.map((categoryKey) => {
                  const items = groupedItems[categoryKey];
                  if (items.length === 0) {
                    return null;
                  }

                  const category = CATEGORIES[categoryKey];

                  return (
                    <CollapsableSection
                      key={categoryKey}
                      label={
                        <Stack direction="row" gap={1} alignItems="center">
                          <span>{category.label}</span>
                          <span className={styles.itemCount}>({items.length})</span>
                        </Stack>
                      }
                      isOpen={expandedSections[categoryKey]}
                      onToggle={() => toggleSection(categoryKey)}
                      className={cx(styles.section, styles[`section_${categoryKey}`])}
                      contentClassName={styles.sectionContent}
                    >
                      <section className={styles.grid}>
                        {items.map((item) => (
                          <NavLandingPageCard
                            key={item.id || item.url}
                            description={item.subTitle}
                            text={item.text}
                            url={item.url ?? ''}
                            category={category.colorStyle}
                            className={styles.bookmarkCard}
                          />
                        ))}
                      </section>
                    </CollapsableSection>
                  );
                })}
              </div>
            )}
          </Stack>
        )}
      </Page.Contents>
    </Page>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  filterBar: css({
    display: 'flex',
    gap: theme.spacing(2),
    flexWrap: 'wrap',
    paddingBottom: theme.spacing(1),
  }),
  filterInput: css({
    flexGrow: 1,
    minWidth: '200px',
    maxWidth: '400px',
  }),
  categorySelect: css({
    minWidth: '180px',
  }),
  categoriesContainer: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  }),
  section: css({
    borderRadius: theme.shape.radius.default,
    padding: theme.spacing(0, 1),
    marginBottom: theme.spacing(1),
  }),
  section_operations: css({
    backgroundColor: theme.colors.warning.transparent,
    border: `1px solid ${theme.colors.warning.borderTransparent}`,
  }),
  section_admin: css({
    backgroundColor: theme.colors.error.transparent,
    border: `1px solid ${theme.colors.error.borderTransparent}`,
  }),
  section_content: css({
    backgroundColor: theme.colors.primary.transparent,
    border: `1px solid ${theme.colors.primary.borderTransparent}`,
  }),
  section_explore: css({
    backgroundColor: theme.colors.success.transparent,
    border: `1px solid ${theme.colors.success.borderTransparent}`,
  }),
  section_other: css({
    backgroundColor: theme.colors.secondary.transparent,
    border: `1px solid ${theme.colors.secondary.borderTransparent}`,
  }),
  sectionContent: css({
    padding: theme.spacing(1, 0),
  }),
  itemCount: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  grid: css({
    display: 'grid',
    gap: theme.spacing(3),
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gridAutoRows: '138px',
  }),
  bookmarkCard: css({
    '&&': {
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        transition: theme.transitions.create(['transform', 'box-shadow'], {
          duration: theme.transitions.duration.short,
        }),
      },
    },
    '&&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows.z2,
    },
  }),
});

export default BookmarksPage;
