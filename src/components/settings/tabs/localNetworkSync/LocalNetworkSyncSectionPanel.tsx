import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingRow } from '@/components/settings/SettingRow';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import {
  readLocalNetworkSyncSetting,
  writeLocalNetworkSyncSetting,
} from '@/lib/localNetworkSync/flag';

export const LocalNetworkSyncSectionPanel = () => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.localNetworkSync.${name}`);
  const [enabled, setEnabled] = useState(readLocalNetworkSyncSetting);

  const onToggle = (checked: boolean) => {
    setEnabled(checked);
    writeLocalNetworkSyncSetting(checked);
  };

  return (
    <section
      data-testid="local-network-sync-section"
      className="mt-8 border-t border-rule pt-6"
    >
      <h2 className="text-[15px] font-semibold text-ink">{k('title')}</h2>
      <p className="mb-4 mt-1 max-w-[540px] font-serif text-[13px] text-ink-2">
        {k('subtitle')}
      </p>

      <SettingRow
        data-testid="local-network-sync-toggle-row"
        label={k('enableLabel')}
        hint={k('enableHint')}
      >
        <Checkbox
          data-testid="local-network-sync-toggle"
          checked={enabled}
          label={enabled ? k('enabled') : k('disabled')}
          onChange={(event) => {
            onToggle(event.currentTarget.checked);
          }}
        />
      </SettingRow>

      <SettingRow
        data-testid="local-network-sync-pair-row"
        disabled={!enabled}
        label={k('pairLabel')}
        hint={enabled ? k('pairHint') : k('pairDisabledHint')}
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            kind="secondary"
            disabled={!enabled}
            data-testid="local-network-sync-pair"
          >
            {k('pairAction')}
          </Button>
          <Button
            type="button"
            size="sm"
            kind="secondary"
            disabled={!enabled}
            data-testid="local-network-sync-join"
          >
            {k('joinAction')}
          </Button>
        </div>
      </SettingRow>

      <div
        role="note"
        data-testid="local-network-sync-notice"
        className="mt-4 border border-rule bg-paper-2 p-3 text-[13px] text-ink-2"
      >
        {k('notice')}
      </div>
    </section>
  );
};
