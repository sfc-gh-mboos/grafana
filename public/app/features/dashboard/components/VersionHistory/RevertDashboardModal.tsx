import { useEffect } from 'react';

import { Trans, t } from '@grafana/i18n';
import { Alert, ConfirmModal, Stack } from '@grafana/ui';

import { useDashboardRestore } from './useDashboardRestore';
export interface RevertDashboardModalProps {
  hideModal: () => void;
  id: number;
  version: number;
}

export const RevertDashboardModal = ({ hideModal, id, version }: RevertDashboardModalProps) => {
  const { state, onRestoreDashboard } = useDashboardRestore(id, version);

  useEffect(() => {
    if (!state.loading && state.value) {
      hideModal();
    }
  }, [state, hideModal]);

  return (
    <ConfirmModal
      isOpen={true}
      title={t('dashboard.revert-dashboard-modal.title-restore-version', 'Restore version')}
      icon="history"
      onDismiss={hideModal}
      onConfirm={onRestoreDashboard}
      body={
        <Stack direction="column" gap={2}>
          {state.error && (
            <Alert
              title={t('dashboard.revert-dashboard-modal.error-title', 'Failed to restore dashboard')}
              severity="error"
            >
              <Trans i18nKey="dashboard.revert-dashboard-modal.error-description">
                An error occurred while restoring the dashboard. Please try again.
              </Trans>
            </Alert>
          )}
          <p>
            <Trans i18nKey="dashboard.revert-dashboard-modal.body-restore-version">
              Are you sure you want to restore the dashboard to version {{ version }}? All unsaved changes will be lost.
            </Trans>
          </p>
        </Stack>
      }
      confirmText={
        state.error
          ? t('dashboard.revert-dashboard-modal.confirmText-retry', 'Retry restore')
          : t('dashboard.revert-dashboard-modal.confirmText-restore-version', 'Yes, restore to version {{version}}', {
              version,
            })
      }
    />
  );
};
