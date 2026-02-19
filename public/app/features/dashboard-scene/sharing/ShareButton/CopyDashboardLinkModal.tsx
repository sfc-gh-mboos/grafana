import { useState } from 'react';
import { useAsyncFn } from 'react-use';

import { SelectableValue } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { VizPanel } from '@grafana/scenes';
import { Button, Field, Modal, RadioButtonGroup } from '@grafana/ui';

import { DashboardScene } from '../../scene/DashboardScene';

import { buildShareUrlWithExpiration } from './utils';

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
  const [copyResult, copyLink] = useAsyncFn(async () => {
    await buildShareUrlWithExpiration(dashboard, panel, selectedTTL);
    onDismiss();
  }, [dashboard, onDismiss, panel, selectedTTL]);

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

      <Modal.ButtonRow>
        <Button variant="secondary" fill="outline" onClick={onDismiss}>
          <Trans i18nKey="common.cancel">Cancel</Trans>
        </Button>
        <Button onClick={copyLink} disabled={copyResult.loading}>
          <Trans i18nKey="dashboard.share.copy-link.action">Copy dashboard link</Trans>
        </Button>
      </Modal.ButtonRow>
    </Modal>
  );
}
