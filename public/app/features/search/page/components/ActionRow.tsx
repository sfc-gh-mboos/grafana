import { css } from '@emotion/css';
import debounce from 'debounce-promise';
import { FormEvent, useMemo } from 'react';

import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { config, getBackendSrv } from '@grafana/runtime';
import { AsyncSelect, Button, Checkbox, RadioButtonGroup, Select, Stack, useStyles2 } from '@grafana/ui';
import { SortPicker } from 'app/core/components/Select/SortPicker';
import { TagFilter, TermCount } from 'app/core/components/TagFilter/TagFilter';
import { OrgUser } from 'app/types/user';

import { SearchLayout, SearchState, UpdatedWithinOption } from '../../types';

interface AuthorOption extends SelectableValue<string> {
  id: number;
  uid: string;
  login: string;
  imgUrl?: string;
}

const updatedWithinFilterOptions: Array<SelectableValue<UpdatedWithinOption>> = [
  { value: '24h', label: t('search.actions.updated-within-24h', 'Updated in 24 hours') },
  { value: '7d', label: t('search.actions.updated-within-7d', 'Updated in 7 days') },
  { value: '30d', label: t('search.actions.updated-within-30d', 'Updated in 30 days') },
  { value: '90d', label: t('search.actions.updated-within-90d', 'Updated in 90 days') },
];

function getLayoutOptions() {
  return [
    {
      value: SearchLayout.Folders,
      icon: 'folder',
      description: t('search.actions.view-as-folders', 'View by folders'),
    },
    { value: SearchLayout.List, icon: 'list-ul', description: t('search.actions.view-as-list', 'View as list') },
  ];
}

interface ActionRowProps {
  state: SearchState;
  showStarredFilter?: boolean;
  showLayout?: boolean;
  sortPlaceholder?: string;

  onLayoutChange: (layout: SearchLayout) => void;
  onSortChange: (value?: string) => void;
  onStarredFilterChange?: (event: FormEvent<HTMLInputElement>) => void;
  onTagFilterChange: (tags: string[]) => void;
  getTagOptions: () => Promise<TermCount[]>;
  getSortOptions: () => Promise<SelectableValue[]>;
  onDatasourceChange: (ds?: string) => void;
  onPanelTypeChange: (pt?: string) => void;
  onSetIncludePanels: (v: boolean) => void;
  onAuthorFilterChange?: (author?: string, authorLogin?: string) => void;
  onUpdatedWithinChange?: (value?: UpdatedWithinOption) => void;
}

export function getValidQueryLayout(q: SearchState): SearchLayout {
  const layout = q.layout ?? SearchLayout.Folders;

  // Folders is not valid when a query exists
  if (layout === SearchLayout.Folders) {
    if (q.query || q.sort || q.starred || q.tag.length > 0 || q.author || q.updatedWithin) {
      return SearchLayout.List;
    }
  }

  return layout;
}

export const ActionRow = ({
  state,
  showStarredFilter,
  showLayout,
  sortPlaceholder,
  onLayoutChange,
  onSortChange,
  onStarredFilterChange = () => {},
  onTagFilterChange,
  getTagOptions,
  getSortOptions,
  onDatasourceChange,
  onPanelTypeChange,
  onSetIncludePanels,
  onAuthorFilterChange = () => {},
  onUpdatedWithinChange = () => {},
}: ActionRowProps) => {
  const styles = useStyles2(getStyles);

  const layout = getValidQueryLayout(state);

  const loadAuthorOptions = useMemo(
    () =>
      debounce(
        async (query = '') => {
          const users = await getBackendSrv().get<OrgUser[]>(
            `/api/org/users/lookup?query=${encodeURIComponent(query)}&limit=100`
          );
          return users.map<AuthorOption>((user) => ({
            id: user.userId,
            uid: user.uid,
            login: user.login,
            value: user.uid,
            label: user.login,
            imgUrl: user.avatarUrl,
          }));
        },
        300,
        { leading: true }
      ),
    []
  );

  const selectedAuthor: AuthorOption | null = state.author
    ? {
        id: 0,
        uid: state.author,
        login: state.authorLogin ?? state.author,
        value: state.author,
        label: state.authorLogin ?? state.author,
      }
    : null;

  // Disabled folder layout option when query is present
  const disabledOptions =
    state.tag.length ||
    state.starred ||
    state.query ||
    state.datasource ||
    state.panel_type ||
    state.author ||
    state.updatedWithin
      ? [SearchLayout.Folders]
      : [];

  return (
    <Stack justifyContent="space-between" alignItems="center">
      <Stack alignItems="center">
        <TagFilter isClearable={false} tags={state.tag} tagOptions={getTagOptions} onChange={onTagFilterChange} />
        {config.featureToggles.panelTitleSearch && (
          <Checkbox
            data-testid="include-panels"
            disabled={layout === SearchLayout.Folders}
            value={state.includePanels}
            onChange={() => onSetIncludePanels(!state.includePanels)}
            label={t('search.actions.include-panels', 'Include panels')}
          />
        )}

        {showStarredFilter && (
          <div className={styles.checkboxWrapper}>
            <Checkbox
              label={t('search.actions.starred', 'Starred')}
              onChange={onStarredFilterChange}
              value={state.starred}
            />
          </div>
        )}
        <AsyncSelect<AuthorOption>
          data-testid="dashboard-author-filter"
          loadOptions={loadAuthorOptions}
          defaultOptions={false}
          value={selectedAuthor}
          onChange={(option) =>
            onAuthorFilterChange(
              option?.uid ?? option?.value,
              option?.login ?? option?.label
            )
          }
          noOptionsMessage={t('search.actions.author-no-users', 'No users found')}
          placeholder={t('search.actions.author-placeholder', 'Author')}
          isClearable
          width={24}
          inputId="dashboard-author-filter"
        />
        <Select<UpdatedWithinOption>
          data-testid="dashboard-updated-within-filter"
          options={updatedWithinFilterOptions}
          value={state.updatedWithin}
          onChange={(value) => onUpdatedWithinChange(value?.value)}
          placeholder={t('search.actions.updated-placeholder', 'Updated')}
          isClearable
          width={24}
          inputId="dashboard-updated-within-filter"
        />
        {state.datasource && (
          <Button icon="times" variant="secondary" onClick={() => onDatasourceChange(undefined)}>
            <Trans i18nKey="search.actions.remove-datasource-filter">
              Datasource: {{ datasource: state.datasource }}
            </Trans>
          </Button>
        )}
        {state.panel_type && (
          <Button icon="times" variant="secondary" onClick={() => onPanelTypeChange(undefined)}>
            <Trans i18nKey="search.action-row.panel-type" values={{ panel: state.panel_type }}>
              Panel: {'{{panel}}'}
            </Trans>
          </Button>
        )}
      </Stack>

      <Stack gap={2}>
        {showLayout && (
          <RadioButtonGroup
            options={getLayoutOptions()}
            disabledOptions={disabledOptions}
            onChange={onLayoutChange}
            value={layout}
          />
        )}
        <SortPicker
          onChange={(change) => onSortChange(change?.value)}
          value={state.sort}
          getSortOptions={getSortOptions}
          placeholder={sortPlaceholder || t('search.actions.sort-placeholder', 'Sort')}
          isClearable
        />
      </Stack>
    </Stack>
  );
};

ActionRow.displayName = 'ActionRow';

export const getStyles = (theme: GrafanaTheme2) => {
  return {
    checkboxWrapper: css({
      label: {
        lineHeight: '1.2',
      },
    }),
  };
};
