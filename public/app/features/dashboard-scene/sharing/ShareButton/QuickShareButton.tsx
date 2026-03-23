import { css } from '@emotion/css';
import { useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { selectors as e2eSelectors } from '@grafana/e2e-selectors';
import { Trans, t } from '@grafana/i18n';
import { Button, ButtonGroup, ConfirmModal, Dropdown, Menu, Spinner, useStyles2 } from '@grafana/ui';

import { DashboardScene } from '../../scene/DashboardScene';

import { useQuickShare } from './useQuickShare';

const selectors = e2eSelectors.pages.Dashboard.DashNav.newShareButton;

export interface QuickShareButtonProps {
  dashboard: DashboardScene;
}

export function QuickShareButton({ dashboard }: QuickShareButtonProps) {
  const styles = useStyles2(getStyles);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  const { isShared, isLoading, isDeleting, canQuickShare, handleQuickShare, handleRevoke, getLabel } =
    useQuickShare(dashboard);

  const getButtonTooltip = () => {
    if (isShared) {
      return t('quick-share.copy-tooltip', 'Copy the public shareable link');
    }
    return t('quick-share.create-tooltip', 'Create a public shareable link and copy it');
  };

  if (!canQuickShare) {
    return null;
  }

  const onRevokeConfirm = async () => {
    await handleRevoke();
    setShowRevokeConfirm(false);
  };

  const QuickShareMenu = () => (
    <Menu>
      {isShared && (
        <Menu.Item
          label={t('quick-share.revoke', 'Revoke share link')}
          icon="trash-alt"
          destructive
          onClick={() => setShowRevokeConfirm(true)}
        />
      )}
    </Menu>
  );

  return (
    <>
      <ButtonGroup className={styles.container}>
        <Button
          data-testid={selectors.shareLink}
          size="sm"
          icon={isShared ? 'link' : 'share-alt'}
          tooltip={getButtonTooltip()}
          onClick={handleQuickShare}
          disabled={isLoading}
        >
          {isLoading ? <Spinner inline size="sm" /> : getLabel()}
        </Button>
        {isShared && (
          <Dropdown overlay={QuickShareMenu} placement="bottom-end" onVisibleChange={setIsMenuOpen}>
            <Button
              size="sm"
              icon={isMenuOpen ? 'angle-up' : 'angle-down'}
              aria-label={t('quick-share.menu-aria', 'Quick share options')}
              disabled={isDeleting}
            />
          </Dropdown>
        )}
      </ButtonGroup>

      <ConfirmModal
        isOpen={showRevokeConfirm}
        title={t('quick-share.revoke-title', 'Revoke share link')}
        body={
          <Trans i18nKey="quick-share.revoke-body">
            Are you sure you want to revoke this share link? Anyone with the link will no longer be able to access
            this dashboard.
          </Trans>
        }
        confirmText={t('quick-share.revoke-confirm', 'Revoke')}
        dismissText={t('quick-share.revoke-cancel', 'Cancel')}
        onConfirm={onRevokeConfirm}
        onDismiss={() => setShowRevokeConfirm(false)}
        confirmButtonVariant="destructive"
      />
    </>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      gap: 1,
    }),
  };
}
