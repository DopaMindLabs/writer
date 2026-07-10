import { useTranslation } from 'react-i18next';

export interface TemplatesFooterActionsProps {
  submitting: boolean;
  canSubmit: boolean;
  submitLabel: string;
}

/** The sync-status hint and the submit control in the New-space footer. */
export const TemplatesFooterActions = ({
  submitting,
  canSubmit,
  submitLabel,
}: TemplatesFooterActionsProps) => {
  const { t } = useTranslation('screens');
  return (
    <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div
          className="flex h-5 w-9 cursor-not-allowed items-center rounded-full bg-paper-2 px-0.5 opacity-60"
          role="switch"
          aria-checked="false"
          aria-disabled="true"
          title={t('templates.syncTooltip')}
        >
          <span className="h-4 w-4 rounded-full bg-ink-4" />
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
          {t('templates.syncLabel')}{' '}
          <span className="italic text-ink-4">{t('templates.syncValue')}</span>
        </span>
      </div>
      <button
        data-testid="templates-submit"
        type="submit"
        disabled={submitting || !canSubmit}
        className="font-serif text-[18px] italic text-ink underline underline-offset-4 hover:text-ink-2 disabled:opacity-50"
      >
        {submitting ? t('templates.creating') : submitLabel}
      </button>
    </div>
  );
};
