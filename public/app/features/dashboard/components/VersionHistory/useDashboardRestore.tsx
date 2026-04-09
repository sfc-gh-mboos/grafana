import { useEffect } from 'react';
import { useAsyncFn } from 'react-use';

import { locationUtil } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import { useAppNotification } from 'app/core/copy/appNotification';
import { historySrv } from 'app/features/dashboard-scene/settings/version-history/HistorySrv';
import { useSelector } from 'app/types/store';

import { dashboardWatcher } from '../../../live/dashboard/dashboardWatcher';
import { DashboardModel } from '../../state/DashboardModel';

const restoreDashboard = async (version: number, dashboard: DashboardModel) => {
  dashboardWatcher.ignoreNextSave();
  return await historySrv.restoreDashboard(dashboard.uid, version);
};

export const useDashboardRestore = (id: number, version: number) => {
  const dashboard = useSelector((state) => state.dashboard.getModel());
  const [state, onRestoreDashboard] = useAsyncFn(async () => await restoreDashboard(id, dashboard!), []);
  const notifyApp = useAppNotification();

  useEffect(() => {
    if (state.value) {
      const location = locationService.getLocation();
      const newUrl = locationUtil.stripBaseFromUrl(state.value.url);
      const prevState = (location.state as any)?.routeReloadCounter;
      locationService.replace({
        ...location,
        pathname: newUrl,
        state: { routeReloadCounter: prevState ? prevState + 1 : 1 },
      });
      notifyApp.success('Dashboard restored', `Restored from version ${version}`);
    }
  }, [state, version, notifyApp]);

  useEffect(() => {
    if (state.error) {
      const errorMessage = state.error instanceof Error ? state.error.message : 'An unexpected error occurred';
      notifyApp.error('Failed to restore dashboard', errorMessage);
    }
  }, [state.error, notifyApp]);

  return { state, onRestoreDashboard };
};
