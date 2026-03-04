import { Action } from 'redux';

import { WithAccessControlMetadata } from '@grafana/data';

import { ManagerKind } from '../apiserver/types';

import { QueryResponse } from './service/types';

export enum DashboardSearchItemType {
  DashDB = 'dash-db',
  DashHome = 'dash-home',
  DashFolder = 'dash-folder',
}

/**
 * @deprecated Use DashboardSearchItem and use UIDs instead of IDs
 * DTO type for search API result items, but with deprecated IDs
 * This type was previously also used heavily for views, so contains lots of
 * extraneous properties
 */
export interface DashboardSearchHit extends WithAccessControlMetadata {
  /** @deprecated use folderUid */
  folderId?: number;
  folderTitle?: string;
  folderUid?: string;
  folderUrl?: string;
  id?: number;
  tags: string[];
  title: string;
  type: DashboardSearchItemType;
  uid: string;
  url: string;
  sortMeta?: number;
  sortMetaName?: string;
  isDeleted?: boolean;
  permanentlyDeleteDate?: string;
}

/**
 * DTO type for search API result items
 * This should not be used directly - use GrafanaSearcher instead and get a DashboardQueryResult
 */
export interface DashboardSearchItem {
  uid: string;
  title: string;
  uri: string;
  url: string;
  type: string; // dash-db, dash-home
  tags: string[];
  isStarred: boolean;

  // Only on dashboards in folders results
  folderUid?: string;
  folderTitle?: string;
  folderUrl?: string;
}

export type DashboardViewItemKind = 'folder' | 'dashboard' | 'panel';

/**
 * Type used in the folder view components
 */
export interface DashboardViewItem {
  kind: DashboardViewItemKind;
  uid: string;
  title: string;
  url?: string;
  tags?: string[];

  icon?: string;

  parentUID?: string;
  /** @deprecated Not used in new Browse UI */
  parentTitle?: string;
  /** @deprecated Not used in new Browse UI */
  parentKind?: string;

  // Used only for psuedo-folders, such as Starred or Recent
  /** @deprecated Not used in new Browse UI */
  itemsUIDs?: string[];

  // For enterprise sort options
  sortMeta?: number | string; // value sorted by
  sortMetaName?: string; // name of the value being sorted e.g. 'Views'
  managedBy?: ManagerKind;
}

export interface SearchAction extends Action {
  payload?: any;
}

export type EventTrackingNamespace = 'manage_dashboards' | 'dashboard_search';

export const UPDATED_WITHIN_OPTIONS = ['24h', '7d', '30d', '90d'] as const;
export type UpdatedWithinOption = (typeof UPDATED_WITHIN_OPTIONS)[number];

export const isUpdatedWithinOption = (value: unknown): value is UpdatedWithinOption => {
  return typeof value === 'string' && UPDATED_WITHIN_OPTIONS.includes(value as UpdatedWithinOption);
};

export interface SearchState {
  query: string;
  tag: string[];
  starred: boolean;
  explain?: boolean; // adds debug info
  datasource?: string;
  panel_type?: string;
  sort?: string;
  prevSort?: string; // Save sorting data between layouts
  layout: SearchLayout;
  result?: QueryResponse;
  loading?: boolean;
  folderUid?: string;
  includePanels?: boolean;
  author?: string;
  authorLogin?: string;
  updatedWithin?: UpdatedWithinOption;
  eventTrackingNamespace: EventTrackingNamespace;
  deleted: boolean;
}

export type OnToggleChecked = (item: DashboardViewItem) => void;

export enum SearchLayout {
  List = 'list',
  Folders = 'folders',
}

export interface SearchQueryParams {
  query?: string | null;
  sort?: string | null;
  starred?: boolean | null;
  tag?: string[] | null;
  layout?: SearchLayout | null;
  folder?: string | null;
  author?: string | null;
  authorLogin?: string | null;
  updatedWithin?: UpdatedWithinOption | null;
}

// new Search Types
export type OnMoveOrDeleleSelectedItems = () => void;
