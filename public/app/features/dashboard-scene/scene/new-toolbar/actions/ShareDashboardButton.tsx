import { useCallback, useContext } from 'react';

import { selectors as e2eSelectors } from '@grafana/e2e-selectors';
import { t } from '@grafana/i18n';
import { ModalsContext } from '@grafana/ui';

import { SaveBeforeShareModal } from '../../../sharing/SaveBeforeShareModal';
import { CopyDashboardLinkModal } from '../../../sharing/ShareButton/CopyDashboardLinkModal';
import ShareMenu from '../../../sharing/ShareButton/ShareMenu';
import { DashboardInteractions } from '../../../utils/interactions';
import { ToolbarActionProps } from '../types';

import { ShareExportDashboardButton } from './ShareExportDashboardButton';

const newShareButtonSelector = e2eSelectors.pages.Dashboard.DashNav.newShareButton;

export const ShareDashboardButton = ({ dashboard }: ToolbarActionProps) => {
  const { showModal, hideModal } = useContext(ModalsContext);

  const openCopyLinkModal = useCallback(() => {
    DashboardInteractions.toolbarShareClick();
    showModal(CopyDashboardLinkModal, { dashboard, onDismiss: hideModal });
  }, [dashboard, hideModal, showModal]);

  const onPrimaryShareClick = useCallback(() => {
    if (dashboard.state.isEditing && dashboard.state.isDirty) {
      showModal(SaveBeforeShareModal, { dashboard, onContinue: openCopyLinkModal, onDismiss: hideModal });
      return;
    }

    openCopyLinkModal();
  }, [dashboard, hideModal, openCopyLinkModal, showModal]);

  return (
    <ShareExportDashboardButton
      menu={() => <ShareMenu dashboard={dashboard} />}
      onMenuVisibilityChange={(isOpen) => {
        if (isOpen) {
          DashboardInteractions.toolbarShareDropdownClick();
        }
      }}
      groupTestId={newShareButtonSelector.shareLink}
      buttonLabel={t('dashboard.toolbar.new.share.title', 'Share')}
      buttonTooltip={t('dashboard.toolbar.new.share.tooltip', 'Copy link')}
      buttonTestId={newShareButtonSelector.container}
      onButtonClick={onPrimaryShareClick}
      arrowLabel={t('dashboard.toolbar.new.share.arrow', 'Share')}
      arrowTestId={newShareButtonSelector.arrowMenu}
      dashboard={dashboard}
      variant={!dashboard.state.isEditing ? 'primary' : 'canvas'}
    />
  );
};
