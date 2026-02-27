import { useMemo } from 'react';

import { useGetUserPreferencesQuery } from '@grafana/api-clients/rtkq/legacy/preferences';

import { contextSrv } from '../../../services/context_srv';
import { normalizeBookmarkPreferences } from './bookmarks';

export const usePinnedItems = () => {
  const preferences = useGetUserPreferencesQuery(undefined, { skip: !contextSrv.user.isSignedIn });
  const pinnedItems = useMemo(() => normalizeBookmarkPreferences(preferences.data?.navbar), [preferences.data?.navbar]);

  return pinnedItems;
};
