import { useCallback } from 'react';

import { t } from '@grafana/i18n';
import { createSuccessNotification } from 'app/core/copy/appNotification';
import { notifyApp } from 'app/core/reducers/appNotification';
import { contextSrv } from 'app/core/services/context_srv';
import {
  useCreatePublicDashboardMutation,
  useDeletePublicDashboardMutation,
  useGetPublicDashboardQuery,
  usePauseOrResumePublicDashboardMutation,
} from 'app/features/dashboard/api/publicDashboardApi';
import {
  generatePublicDashboardUrl,
  isPublicDashboardsEnabled,
  PublicDashboardShareType,
} from 'app/features/dashboard/components/ShareModal/SharePublicDashboard/SharePublicDashboardUtils';
import { AccessControlAction } from 'app/types/accessControl';
import { useDispatch } from 'app/types/store';

import { DashboardScene } from '../../scene/DashboardScene';
import { DashboardInteractions } from '../../utils/interactions';

export interface UseQuickShareResult {
  isShared: boolean;
  isPaused: boolean;
  isLoading: boolean;
  isDeleting: boolean;
  canQuickShare: boolean;
  handleQuickShare: () => Promise<void>;
  handleRevoke: () => Promise<void>;
  getLabel: () => string;
  getDescription: () => string;
}

export function useQuickShare(dashboard: DashboardScene): UseQuickShareResult {
  const dispatch = useDispatch();
  const dashboardUid = dashboard.state.uid;
  const hasWritePermissions = contextSrv.hasPermission(AccessControlAction.DashboardsPublicWrite);

  const { data: publicDashboard, isLoading: isQueryLoading } = useGetPublicDashboardQuery(dashboardUid ?? '', {
    skip: !dashboardUid,
  });
  const [createPublicDashboard, { isLoading: isCreating }] = useCreatePublicDashboardMutation();
  const [deletePublicDashboard, { isLoading: isDeleting }] = useDeletePublicDashboardMutation();
  const [pauseOrResume, { isLoading: isResuming }] = usePauseOrResumePublicDashboardMutation();

  const isShared = publicDashboard?.uid !== undefined && publicDashboard?.uid !== '';
  const isPaused = isShared && !publicDashboard?.isEnabled;
  const isLoading = isQueryLoading || isCreating || isResuming;
  const canQuickShare = isPublicDashboardsEnabled() && hasWritePermissions && !!dashboardUid;

  const copyUrlToClipboard = useCallback(
    async (accessToken: string) => {
      const url = generatePublicDashboardUrl(accessToken);
      await navigator.clipboard.writeText(url);
      dispatch(
        notifyApp(createSuccessNotification(t('quick-share.link-copied', 'Shareable link copied to clipboard')))
      );
      DashboardInteractions.quickShareLinkCopied();
    },
    [dispatch]
  );

  const handleQuickShare = useCallback(async () => {
    DashboardInteractions.quickShareClicked();

    if (isShared && publicDashboard?.accessToken) {
      if (isPaused) {
        const result = await pauseOrResume({
          dashboard,
          payload: {
            ...publicDashboard,
            isEnabled: true,
          },
        }).unwrap();
        if (result.accessToken) {
          await copyUrlToClipboard(result.accessToken);
        }
      } else {
        await copyUrlToClipboard(publicDashboard.accessToken);
      }
    } else {
      const result = await createPublicDashboard({
        dashboard,
        payload: {
          isEnabled: true,
          share: PublicDashboardShareType.PUBLIC,
          annotationsEnabled: false,
          timeSelectionEnabled: false,
        },
      }).unwrap();
      if (result.accessToken) {
        await copyUrlToClipboard(result.accessToken);
      }
    }
  }, [isShared, isPaused, publicDashboard, dashboard, createPublicDashboard, pauseOrResume, copyUrlToClipboard]);

  const handleRevoke = useCallback(async () => {
    if (!publicDashboard?.uid || !dashboardUid) {
      return;
    }
    DashboardInteractions.quickShareRevoked();
    await deletePublicDashboard({
      dashboard,
      uid: publicDashboard.uid,
      dashboardUid,
    });
  }, [dashboard, dashboardUid, deletePublicDashboard, publicDashboard?.uid]);

  const getLabel = useCallback(() => {
    if (isCreating) {
      return t('quick-share.creating', 'Creating link...');
    }
    if (isPaused) {
      return t('quick-share.resume-share', 'Resume & copy link');
    }
    if (isShared) {
      return t('quick-share.copy-link', 'Copy share link');
    }
    return t('quick-share.create', 'Quick share link');
  }, [isCreating, isPaused, isShared]);

  const getDescription = useCallback(() => {
    if (isPaused) {
      return t('quick-share.resume-description', 'Resume sharing and copy the public link');
    }
    if (isShared) {
      return t('quick-share.copy-description', 'Copy the public shareable link');
    }
    return t('quick-share.create-description', 'Create a public link anyone can access');
  }, [isPaused, isShared]);

  return {
    isShared,
    isPaused,
    isLoading,
    isDeleting,
    canQuickShare,
    handleQuickShare,
    handleRevoke,
    getLabel,
    getDescription,
  };
}
