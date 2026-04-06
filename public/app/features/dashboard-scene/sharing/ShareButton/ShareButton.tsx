import { css } from '@emotion/css';
import { useCallback, useContext, useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { selectors as e2eSelectors } from '@grafana/e2e-selectors';
import { Trans, t } from '@grafana/i18n';
import { VizPanel } from '@grafana/scenes';
import { Button, ButtonGroup, Dropdown, ModalsContext, useStyles2 } from '@grafana/ui';

import { DashboardScene } from '../../scene/DashboardScene';
import { DashboardInteractions } from '../../utils/interactions';

import { CopyDashboardLinkModal } from './CopyDashboardLinkModal';
import ShareMenu from './ShareMenu';

const newShareButtonSelector = e2eSelectors.pages.Dashboard.DashNav.newShareButton;

export default function ShareButton({ dashboard, panel }: { dashboard: DashboardScene; panel?: VizPanel }) {
  const styles = useStyles2(getStyles);
  const { showModal, hideModal } = useContext(ModalsContext);
  const [isOpen, setIsOpen] = useState(false);
  const openCopyLinkModal = useCallback(() => {
    DashboardInteractions.toolbarShareClick();
    showModal(CopyDashboardLinkModal, { dashboard, panel, onDismiss: hideModal });
  }, [dashboard, hideModal, panel, showModal]);

  const onMenuClick = useCallback((isOpen: boolean) => {
    if (isOpen) {
      DashboardInteractions.toolbarShareDropdownClick();
    }

    setIsOpen(isOpen);
  }, []);

  const MenuActions = () => <ShareMenu dashboard={dashboard} panel={panel} />;

  return (
    <ButtonGroup data-testid={newShareButtonSelector.container} className={styles.container}>
      <Button
        data-testid={newShareButtonSelector.shareLink}
        size="sm"
        tooltip={t('share-dashboard.share-button-tooltip', 'Copy link')}
        onClick={openCopyLinkModal}
      >
        <Trans i18nKey="share-dashboard.share-button">Share</Trans>
      </Button>
      <Dropdown overlay={MenuActions} placement="bottom-end" onVisibleChange={onMenuClick}>
        <Button
          aria-label={t('dashboard-scene.share-button.aria-label-sharedropdownmenu', 'Toggle share menu')}
          data-testid={newShareButtonSelector.arrowMenu}
          size="sm"
          icon={isOpen ? 'angle-up' : 'angle-down'}
        />
      </Dropdown>
    </ButtonGroup>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      gap: 1,
    }),
  };
}
