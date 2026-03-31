import { useCallback, useContext, useMemo } from 'react';
import * as React from 'react';

import { selectors as e2eSelectors } from '@grafana/e2e-selectors';
import { t } from '@grafana/i18n';
import { config, locationService } from '@grafana/runtime';
import { VizPanel } from '@grafana/scenes';
import { IconName, Menu, ModalsContext } from '@grafana/ui';
import { createSuccessNotification } from 'app/core/copy/appNotification';
import { notifyApp } from 'app/core/reducers/appNotification';
import { contextSrv } from 'app/core/services/context_srv';
import { copyStringToClipboard } from 'app/core/utils/explore';
import { dispatch } from 'app/store/store';
import { AccessControlAction } from 'app/types/accessControl';

import { isPublicDashboardsEnabled } from '../../../dashboard/components/ShareModal/SharePublicDashboard/SharePublicDashboardUtils';
import { getTrackingSource, shareDashboardType } from '../../../dashboard/components/ShareModal/utils';
import { DashboardScene } from '../../scene/DashboardScene';
import { DashboardInteractions } from '../../utils/interactions';
import { SaveBeforeShareModal } from '../SaveBeforeShareModal';

const newShareButtonSelector = e2eSelectors.pages.Dashboard.DashNav.newShareButton.menu;
const copyDashboardUidShareId = 'copy_dashboard_uid';

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

  const onMenuItemClick = (shareView: string) => {
    locationService.partial({ shareView });
  };

  const buildMenuItems = useCallback(() => {
    const menuItems: ShareDrawerMenuItem[] = [];

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
      icon: 'share-alt',
      label: t('share-dashboard.menu.share-externally-title', 'Share externally'),
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

    menuItems.push({
      shareId: copyDashboardUidShareId,
      testId: newShareButtonSelector.copyDashboardUid,
      icon: 'copy',
      label: t('share-dashboard.menu.copy-dashboard-uid-title', 'Copy dashboard UID'),
      renderCondition: Boolean(dashboard.state.uid),
      onClick: () => {
        const { uid } = dashboard.state;
        if (!uid) {
          return;
        }

        copyStringToClipboard(uid);
        dispatch(
          notifyApp(
            createSuccessNotification(
              t('share-dashboard.menu.copy-dashboard-uid-success', 'Dashboard UID copied to clipboard')
            )
          )
        );
      },
    });

    customShareDrawerItems.forEach((d) => menuItems.push(d));

    return menuItems.filter((item) => item.renderCondition);
  }, [dashboard.state.uid, panel]);

  const onClick = useCallback(
    (item: ShareDrawerMenuItem) => {
      const continueAction = () => {
        DashboardInteractions.sharingCategoryClicked({
          item: item.shareId,
          shareResource: getTrackingSource(panel?.getRef()),
        });

        item.onClick(dashboard);
      };

      if (item.shareId !== copyDashboardUidShareId && dashboard.state.isEditing && dashboard.state.isDirty) {
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

  return (
    <Menu data-testid={newShareButtonSelector.container}>
      {menuItemsWithHandlers.map((item) => (
        <React.Fragment key={item.shareId}>
          {item.renderDividerAbove && <Menu.Divider />}
          <Menu.Item
            testId={item.testId}
            label={item.label}
            icon={item.icon}
            description={item.description}
            component={item.component}
            className={item.className}
            onClick={item.onSelect}
          />
        </React.Fragment>
      ))}
    </Menu>
  );
}
