import { useCallback, useMemo, useState } from 'react';

import { SelectableValue } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { VizPanel } from '@grafana/scenes';
import { Button, Field, Modal, Select } from '@grafana/ui';

import { DashboardScene } from '../../scene/DashboardScene';

import { buildShareUrl, ShareDashboardLinkExpiration } from './utils';

interface Props {
  dashboard: DashboardScene;
  panel?: VizPanel;
  onDismiss: () => void;
}

const DEFAULT_EXPIRATION: ShareDashboardLinkExpiration = '24h';

export function CopyDashboardLinkModal({ dashboard, panel, onDismiss }: Props) {
  const [expiration, setExpiration] = useState<ShareDashboardLinkExpiration>(DEFAULT_EXPIRATION);
  const [isCopying, setIsCopying] = useState(false);

  const options = useMemo<Array<SelectableValue<ShareDashboardLinkExpiration>>>(
    () => [
      { value: '1h', label: t('dashboard.share.copy-link.expiration.1h', '1 hour') },
      { value: '24h', label: t('dashboard.share.copy-link.expiration.24h', '24 hours') },
      { value: '7d', label: t('dashboard.share.copy-link.expiration.7d', '7 days') },
      { value: 'never', label: t('dashboard.share.copy-link.expiration.never', 'Never expires') },
    ],
    []
  );

  const onCopy = useCallback(async () => {
    setIsCopying(true);
    try {
      await buildShareUrl(dashboard, panel, expiration);
      onDismiss();
    } finally {
      setIsCopying(false);
    }
  }, [dashboard, expiration, onDismiss, panel]);

  return (
    <Modal
      isOpen={true}
      title={t('dashboard.share.copy-link.modal.title', 'Copy dashboard link')}
      onDismiss={onDismiss}
      icon="link"
    >
      <p>
        <Trans i18nKey="dashboard.share.copy-link.modal.description">
          Choose when this share link should expire, then copy it to your clipboard.
        </Trans>
      </p>
      <Field label={t('dashboard.share.copy-link.modal.expiration-label', 'Link expiration')}>
        <Select
          options={options}
          value={expiration}
          onChange={(option) => setExpiration(option.value ?? DEFAULT_EXPIRATION)}
          inputId="dashboard-share-link-expiration"
          isClearable={false}
        />
      </Field>
      <Modal.ButtonRow>
        <Button variant="secondary" fill="outline" onClick={onDismiss}>
          <Trans i18nKey="common.cancel">Cancel</Trans>
        </Button>
        <Button icon="copy" onClick={onCopy} disabled={isCopying}>
          <Trans i18nKey="dashboard.share.copy-link.modal.copy-button">Copy link</Trans>
        </Button>
      </Modal.ButtonRow>
    </Modal>
  );
}
