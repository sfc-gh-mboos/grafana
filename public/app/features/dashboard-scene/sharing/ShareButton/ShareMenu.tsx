import { useCallback, useContext, useMemo, useState } from 'react';
import * as React from 'react';

import { selectors as e2eSelectors } from '@grafana/e2e-selectors';
import { t } from '@grafana/i18n';
import { config, locationService } from '@grafana/runtime';
import { VizPanel } from '@grafana/scenes';
import { ConfirmModal, IconName, Menu, ModalsContext } from '@grafana/ui';
import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/types/accessControl';

import { isPublicDashboardsEnabled } from '../../../dashboard/components/ShareModal/SharePublicDashboard/SharePublicDashboardUtils';
import { getTrackingSource, shareDashboardType } from '../../../dashboard/components/ShareModal/utils';
import { DashboardScene } from '../../scene/DashboardScene';
import { DashboardInteractions } from '../../utils/interactions';
import { SaveBeforeShareModal } from '../SaveBeforeShareModal';

import { useQuickShare } from './useQuickShare';

const newShareButtonSelector = e2eSelectors.pages.Dashboard.DashNav.newShareButton.menu;

export const shareDashboardTypeQuickShare = 'quick_share';
export const shareDashboardTypeRevokeQuickShare = 'revoke_quick_share';

export interface ShareDrawerMenuItem {
  shareId: string;
  testId: string;
  label: string;
  description?: string;
  icon: IconName;
  renderCondition: boolean;
  onClick: (d: DashboardScene) => void;
  renderDividerAbove?: boolean;
  component?: React.ComponentType;
  className?: string;
  destructive?: boolean;
}

let customShareDrawerItems: ShareDrawerMenuItem[] = [];

export function addDashboardShareDrawerItem(item: ShareDrawerMenuItem) {
  customShareDrawerItems.push(item);
}

export function resetDashboardShareDrawerItems() {
  customShareDrawerItems = [];
}

export default function ShareMenu({ dashboard, panel }: { dashboard: DashboardScene; panel?: VizPanel }) {
  const { showModal, hideModal } = useContext(ModalsContext);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  const quickShare = useQuickShare(dashboard);

  const onMenuItemClick = (shareView: string) => {
    locationService.partial({ shareView });
  };

  const buildMenuItems = useCallback(() => {
    const menuItems: ShareDrawerMenuItem[] = [];

    if (!panel && quickShare.canQuickShare) {
      menuItems.push({
        shareId: shareDashboardTypeQuickShare,
        testId: newShareButtonSelector.shareInternally,
        icon: quickShare.isShared ? 'link' : 'share-alt',
        label: quickShare.getLabel(),
        description: quickShare.getDescription(),
        renderCondition: true,
        onClick: () => {
          quickShare.handleQuickShare();
        },
      });

      if (quickShare.isShared) {
        menuItems.push({
          shareId: shareDashboardTypeRevokeQuickShare,
          testId: newShareButtonSelector.shareExternally,
          icon: 'trash-alt',
          label: t('quick-share.revoke', 'Revoke share link'),
          description: t('quick-share.revoke-description', 'Remove public access to this dashboard'),
          renderCondition: true,
          destructive: true,
          onClick: () => {
            setShowRevokeConfirm(true);
          },
        });
      }

      menuItems.push({
        shareId: 'quick_share_divider',
        testId: '',
        icon: 'link',
        label: '',
        renderCondition: true,
        renderDividerAbove: true,
        onClick: () => {},
      });
    }

    menuItems.push({
      shareId: shareDashboardType.link,
      testId: newShareButtonSelector.shareInternally,
      icon: 'building',
      label: t('share-dashboard.menu.share-internally-title', 'Share internally'),
      renderCondition: true,
      onClick: () => onMenuItemClick(shareDashboardType.link),
    });

    menuItems.push({
      shareId: shareDashboardType.publicDashboard,
      testId: newShareButtonSelector.shareExternally,
      icon: 'cog',
      label: t('share-dashboard.menu.share-externally-title', 'Share externally settings'),
      description: t('share-dashboard.menu.share-externally-description', 'Configure public dashboard options'),
      renderCondition: !panel && isPublicDashboardsEnabled(),
      onClick: () => {
        onMenuItemClick(shareDashboardType.publicDashboard);
      },
    });

    menuItems.push({
      shareId: shareDashboardType.snapshot,
      testId: newShareButtonSelector.shareSnapshot,
      icon: 'camera',
      label: t('share-dashboard.menu.share-snapshot-title', 'Share snapshot'),
      renderCondition:
        contextSrv.isSignedIn &&
        config.snapshotEnabled &&
        contextSrv.hasPermission(AccessControlAction.SnapshotsCreate),
      onClick: () => {
        onMenuItemClick(shareDashboardType.snapshot);
      },
    });

    customShareDrawerItems.forEach((d) => menuItems.push(d));

    return menuItems.filter((item) => item.renderCondition && item.shareId !== 'quick_share_divider');
  }, [panel, quickShare]);

  const onClick = useCallback(
    (item: ShareDrawerMenuItem) => {
      const continueAction = () => {
        DashboardInteractions.sharingCategoryClicked({
          item: item.shareId,
          shareResource: getTrackingSource(panel?.getRef()),
        });

        item.onClick(dashboard);
      };

      if (item.shareId === shareDashboardTypeQuickShare || item.shareId === shareDashboardTypeRevokeQuickShare) {
        continueAction();
        return;
      }

      if (dashboard.state.isEditing && dashboard.state.isDirty) {
        showModal(SaveBeforeShareModal, { dashboard, onContinue: continueAction, onDismiss: hideModal });
        return;
      }

      continueAction();
    },
    [dashboard, hideModal, panel, showModal]
  );

  const menuItems = useMemo(() => buildMenuItems(), [buildMenuItems]);

  const menuItemsWithHandlers = useMemo(() => {
    return menuItems.map((item) => ({
      ...item,
      onSelect: () => onClick(item),
    }));
  }, [menuItems, onClick]);

  const handleRevokeConfirm = useCallback(async () => {
    await quickShare.handleRevoke();
    setShowRevokeConfirm(false);
  }, [quickShare]);

  return (
    <>
      <Menu data-testid={newShareButtonSelector.container}>
        {menuItemsWithHandlers.map((item, index) => (
          <React.Fragment key={item.shareId}>
            {item.renderDividerAbove && <Menu.Divider />}
            {item.shareId !== 'quick_share_divider' && (
              <Menu.Item
                testId={item.testId}
                label={item.label}
                icon={item.icon}
                description={item.description}
                component={item.component}
                className={item.className}
                destructive={item.destructive}
                onClick={item.onSelect}
              />
            )}
            {index === 1 && quickShare.canQuickShare && quickShare.isShared && <Menu.Divider />}
          </React.Fragment>
        ))}
      </Menu>

      <ConfirmModal
        isOpen={showRevokeConfirm}
        title={t('quick-share.revoke-title', 'Revoke share link')}
        body={t(
          'quick-share.revoke-body',
          'Are you sure you want to revoke this share link? Anyone with the link will no longer be able to access this dashboard.'
        )}
        confirmText={t('quick-share.revoke-confirm', 'Revoke')}
        dismissText={t('quick-share.revoke-cancel', 'Cancel')}
        onConfirm={handleRevokeConfirm}
        onDismiss={() => setShowRevokeConfirm(false)}
        confirmButtonVariant="destructive"
      />
    </>
  );
}
