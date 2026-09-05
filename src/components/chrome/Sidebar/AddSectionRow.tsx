import { useTranslation } from 'react-i18next';
import { Plus } from '@/components/libs/icons';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import type { AddSectionController } from './Sidebar.types';

export const AddSectionRow = ({ add }: { add: AddSectionController }) => {
  const { t } = useTranslation('chrome');
  if (add.adding) {
    return (
      <div
        data-testid="sidebar-add-section-row"
        className="-ml-px flex items-center gap-2 border-l-2 border-ink px-5 py-1"
      >
        <TextField
          ref={add.inputRef}
          variant="bare"
          value={add.value}
          onChange={(e) => { add.onChange(e.target.value); }}
          onKeyDown={add.onKeyDown}
          onBlur={add.onBlur}
          placeholder={t('sidebar.sectionNamePlaceholder')}
          aria-label={t('sidebar.addSectionAria')}
          data-testid="sidebar-add-section-input"
          className="flex-1 text-[13px]"
        />
      </div>
    );
  }
  return (
    <div
      data-testid="sidebar-add-section-row"
      className="group mt-1 px-5 py-1"
    >
      <Button
        kind="bare"
        size="none"
        onClick={add.onStart}
        data-testid="sidebar-add-section-trigger"
        aria-label={t('sidebar.addSectionAria')}
        className="flex w-full items-center justify-start gap-1 font-mono text-[9px] font-normal tracking-[0.08em] text-ink-4 opacity-0 transition-opacity hover:text-ink focus-visible:text-ink focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100"
      >
        <Plus className="h-3 w-3" />
        <span>{t('sidebar.addSection')}</span>
      </Button>
    </div>
  );
};
