import { useCallback, useContext } from 'react';
import { useAsyncFn } from 'react-use';

import { selectors as e2eSelectors } from '@grafana/e2e-selectors';
import { t } from '@grafana/i18n';
import { ToolbarButton, ModalsContext } from '@grafana/ui';

import { SaveBeforeShareModal } from '../../../sharing/SaveBeforeShareModal';
import { buildShareUrl } from '../../../sharing/ShareButton/utils';
import { DashboardInteractions } from '../../../utils/interactions';
import { ToolbarActionProps } from '../types';

const copyLinkSelector = e2eSelectors.pages.Dashboard.DashNav.copyLinkButton;

export const CopyLinkButton = ({ dashboard }: ToolbarActionProps) => {
  const { showModal, hideModal } = useContext(ModalsContext);

  const [_, copyLink] = useAsyncFn(async () => {
    DashboardInteractions.toolbarCopyLinkClick();
    await buildShareUrl(dashboard);
  }, [dashboard]);

  const onCopyLink = useCallback(() => {
    if (dashboard.state.isEditing && dashboard.state.isDirty) {
      showModal(SaveBeforeShareModal, { dashboard, onContinue: copyLink, onDismiss: hideModal });
      return;
    }

    copyLink();
  }, [copyLink, dashboard, hideModal, showModal]);

  return (
    <ToolbarButton
      data-testid={copyLinkSelector}
      tooltip={t('dashboard.toolbar.copy-link.tooltip', 'Copy dashboard URL to clipboard')}
      icon="copy"
      onClick={onCopyLink}
    />
  );
};
