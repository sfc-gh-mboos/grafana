import { render, screen } from '@testing-library/react';
import { Subject } from 'rxjs';

import { applyFieldOverrides, createTheme, DataFrame, DataFrameView, FieldType, toDataFrame } from '@grafana/data';

import { getGrafanaSearcher } from '../../service/searcher';
import { DashboardQueryResult, QueryResponse } from '../../service/types';

import { SearchResultsTable } from './SearchResultsTable';

describe('SearchResultsTable', () => {
  const mockOnTagSelected = jest.fn();
  const mockClearSelection = jest.fn();
  const mockSelectionToggle = jest.fn();
  const mockSelection = jest.fn();
  const mockKeyboardEvents = new Subject<React.KeyboardEvent>();

  describe('when there is data', () => {
    const searchData = toDataFrame({
      name: 'A',
      fields: [
        { name: 'kind', type: FieldType.string, config: {}, values: ['dashboard'] },
        { name: 'uid', type: FieldType.string, config: {}, values: ['my-dashboard-1'] },
        { name: 'name', type: FieldType.string, config: {}, values: ['My dashboard 1'] },
        { name: 'panel_type', type: FieldType.string, config: {}, values: [''] },
        { name: 'url', type: FieldType.string, config: {}, values: ['/my-dashboard-1'] },
        { name: 'tags', type: FieldType.other, config: {}, values: [['foo', 'bar']] },
        { name: 'ds_uid', type: FieldType.other, config: {}, values: [''] },
        { name: 'panel_avg_load_time_ms_last_30_days', type: FieldType.number, config: {}, values: [600] },
        { name: 'panel_error_rate_pct_last_30_days', type: FieldType.number, config: {}, values: [1] },
        { name: 'errors_last_30_days', type: FieldType.number, config: {}, values: [1] },
        { name: 'queries_last_30_days', type: FieldType.number, config: {}, values: [120] },
        { name: 'location', type: FieldType.string, config: {}, values: ['/my-dashboard-1'] },
      ],
    });
    const dataFrames = applyFieldOverrides({
      data: [searchData],
      fieldConfig: {
        defaults: {},
        overrides: [],
      },
      replaceVariables: (value, vars, format) => {
        return vars && value === '${__value.text}' ? vars['__value']!.value.text : value;
      },
      theme: createTheme(),
    });

    const mockSearchResult: QueryResponse = {
      isItemLoaded: jest.fn().mockReturnValue(true),
      loadMoreItems: jest.fn(),
      totalRows: searchData.length,
      view: new DataFrameView<DashboardQueryResult>(dataFrames[0]),
    };

    beforeAll(() => {
      jest.spyOn(getGrafanaSearcher(), 'search').mockResolvedValue(mockSearchResult);
    });

    it('shows the table with the correct accessible label', async () => {
      render(
        <SearchResultsTable
          keyboardEvents={mockKeyboardEvents}
          response={mockSearchResult}
          onTagSelected={mockOnTagSelected}
          selection={mockSelection}
          selectionToggle={mockSelectionToggle}
          clearSelection={mockClearSelection}
          height={1000}
          width={1000}
        />
      );
      const table = await screen.findByRole('table', { name: 'Search results table' });
      expect(table).toBeInTheDocument();
    });

    it('has the correct row headers', async () => {
      render(
        <SearchResultsTable
          keyboardEvents={mockKeyboardEvents}
          response={mockSearchResult}
          onTagSelected={mockOnTagSelected}
          selection={mockSelection}
          selectionToggle={mockSelectionToggle}
          clearSelection={mockClearSelection}
          height={1000}
          width={1000}
        />
      );
      await screen.findByRole('table');
      expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Type' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Health' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Tags' })).toBeInTheDocument();
    });

    it('displays the data correctly in the table', async () => {
      render(
        <SearchResultsTable
          keyboardEvents={mockKeyboardEvents}
          response={mockSearchResult}
          onTagSelected={mockOnTagSelected}
          selection={mockSelection}
          selectionToggle={mockSelectionToggle}
          clearSelection={mockClearSelection}
          height={1000}
          width={1000}
        />
      );
      await screen.findByRole('table');

      const rows = screen.getAllByRole('row');

      expect(rows).toHaveLength(2);
      expect(screen.getByText('My dashboard 1')).toBeInTheDocument();
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('foo')).toBeInTheDocument();
      expect(screen.getByText('bar')).toBeInTheDocument();
    });
  });

  describe('when there is no data', () => {
    const emptySearchData: DataFrame = {
      fields: [
        { name: 'kind', type: FieldType.string, config: {}, values: [] },
        { name: 'name', type: FieldType.string, config: {}, values: [] },
        { name: 'uid', type: FieldType.string, config: {}, values: [] },
        { name: 'url', type: FieldType.string, config: {}, values: [] },
        { name: 'tags', type: FieldType.other, config: {}, values: [] },
        { name: 'location', type: FieldType.string, config: {}, values: [] },
      ],
      length: 0,
    };

    const mockEmptySearchResult: QueryResponse = {
      isItemLoaded: jest.fn(),
      loadMoreItems: jest.fn(),
      totalRows: emptySearchData.length,
      view: new DataFrameView<DashboardQueryResult>(emptySearchData),
    };

    beforeAll(() => {
      jest.spyOn(getGrafanaSearcher(), 'search').mockResolvedValue(mockEmptySearchResult);
    });

    it('shows a "No data" message', async () => {
      render(
        <SearchResultsTable
          keyboardEvents={mockKeyboardEvents}
          response={mockEmptySearchResult}
          onTagSelected={mockOnTagSelected}
          selection={mockSelection}
          selectionToggle={mockSelectionToggle}
          clearSelection={mockClearSelection}
          height={1000}
          width={1000}
        />
      );
      const noData = await screen.findByText('No values');
      expect(noData).toBeInTheDocument();
      expect(screen.queryByRole('table', { name: 'Search results table' })).not.toBeInTheDocument();
    });
  });
});
