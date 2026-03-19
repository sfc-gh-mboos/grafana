import { useState } from 'react';
import { useAsyncFn } from 'react-use';

import { SelectableValue } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { VizPanel } from '@grafana/scenes';
import { Alert, Button, ClipboardButton, Field, Input, Modal, RadioButtonGroup } from '@grafana/ui';

import { DashboardScene } from '../../scene/DashboardScene';

import {
  buildShareUrlWithExpiration,
  getLastCopiedDashboardShortLink,
  revokeDashboardShareLink,
} from './utils';

export interface CopyDashboardLinkModalProps {
  dashboard: DashboardScene;
  panel?: VizPanel;
  onDismiss: () => void;
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 24;

const getExpirationOptions = (): Array<SelectableValue<number>> => {
  return [
    {
      label: t('dashboard.share.copy-link.expire-1-hour', '1 hour'),
      value: 60 * 60,
    },
    {
      label: t('dashboard.share.copy-link.expire-1-day', '1 day'),
      value: 60 * 60 * 24,
    },
    {
      label: t('dashboard.share.copy-link.expire-1-week', '1 week'),
      value: 60 * 60 * 24 * 7,
    },
    {
      label: t('dashboard.share.copy-link.expire-never', 'Never'),
      value: 0,
    },
  ];
};

export function CopyDashboardLinkModal({ dashboard, panel, onDismiss }: CopyDashboardLinkModalProps) {
  const [selectedTTL, setSelectedTTL] = useState<number>(DEFAULT_TTL_SECONDS);
  const [copiedLink, setCopiedLink] = useState<string | undefined>(() => getLastCopiedDashboardShortLink());
  const [copyResult, copyLink] = useAsyncFn(async () => {
    const copiedShortLink = await buildShareUrlWithExpiration(dashboard, panel, selectedTTL);
    setCopiedLink(copiedShortLink);
  }, [dashboard, panel, selectedTTL]);
  const [revokeResult, revokeLink] = useAsyncFn(async () => {
    if (!copiedLink) {
      return;
    }

    await revokeDashboardShareLink(copiedLink);
    setCopiedLink(undefined);
  }, [copiedLink]);

  const isActionLoading = copyResult.loading || revokeResult.loading;

  const copyButtonLabel = copiedLink
    ? t('dashboard.share.copy-link.action-generate-new', 'Generate and copy new link')
    : t('dashboard.share.copy-link.action', 'Copy dashboard link');

  const revokeButtonLabel = t('dashboard.share.copy-link.revoke-action', 'Revoke current link now');
  const currentLinkLabel = t('dashboard.share.copy-link.current-link', 'Current copied link');

  const revokeInfoText = t(
    'dashboard.share.copy-link.revoke-info',
    'Revoke this link to immediately invalidate access before the selected expiry.'
  );

  const revokeAlertTitle = t('dashboard.share.copy-link.revoke-alert-title', 'Link can be invalidated immediately');

  const closeButtonLabel = t('dashboard.share.copy-link.close', 'Close');

  const copiedLinkButtonLabel = t('dashboard.share.copy-link.copy-existing-link', 'Copy current link');

  const copiedLinkDescription = t(
    'dashboard.share.copy-link.current-link-description',
    'Use this link while it is valid, or revoke it right away if access should stop now.'
  );

  const disableRevokeButton = !copiedLink || isActionLoading;

  const onRevokeLink = () => {
    revokeLink();
  };

  const getCopiedLink = () => {
    return copiedLink ?? '';
  };

  return (
    <Modal
      isOpen={true}
      title={t('dashboard.share.copy-link.title', 'Copy dashboard link')}
      onDismiss={onDismiss}
      icon="link"
    >
      <p>
        <Trans i18nKey="dashboard.share.copy-link.description">
          Create a short dashboard link and choose when its share token expires.
        </Trans>
      </p>
      <Field label={t('dashboard.share.copy-link.expiration', 'Token expiration')}>
        <RadioButtonGroup<number> options={getExpirationOptions()} value={selectedTTL} onChange={setSelectedTTL} />
      </Field>
      {copiedLink && (
        <>
          <Field label={currentLinkLabel} description={copiedLinkDescription}>
            <Input
              value={copiedLink}
              readOnly
              addonAfter={
                <ClipboardButton icon="copy" variant="primary" getText={getCopiedLink}>
                  {copiedLinkButtonLabel}
                </ClipboardButton>
              }
            />
          </Field>
          <Alert title={revokeAlertTitle} severity="warning" bottomSpacing={1}>
            {revokeInfoText}
          </Alert>
        </>
      )}

      <Modal.ButtonRow>
        <Button variant="secondary" fill="outline" onClick={onDismiss} disabled={isActionLoading}>
          {closeButtonLabel}
        </Button>
        <Button variant="destructive" fill="outline" onClick={onRevokeLink} disabled={disableRevokeButton}>
          {revokeButtonLabel}
        </Button>
        <Button onClick={copyLink} disabled={isActionLoading}>
          {copyButtonLabel}
        </Button>
      </Modal.ButtonRow>
    </Modal>
  );
}
