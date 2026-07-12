import type { Template } from '@/data/templates';
import { cn } from '@/lib/utils';
import { TemplateCardTitle } from './TemplateCardTitle';

export interface TemplateCardProps {
  tpl: Template;
  index: number;
  active: boolean;
  label: string;
  description?: string;
  onSelect: (tpl: Template) => void;
}

/** A single selectable template row in the New-space picker. */
export const TemplateCard = ({
  tpl,
  index,
  active,
  label,
  description,
  onSelect,
}: TemplateCardProps) => {
  const sectionPreview = tpl.sections.map((s) => s.label).join(' · ');
  return (
    <button
      data-testid={`templates-card-${tpl.id}`}
      type="button"
      onClick={() => { onSelect(tpl); }}
      className={cn(
        'grid w-full grid-cols-[1.5rem_1fr_2rem] items-baseline gap-4 border-b border-rule px-2 py-3.5 text-left transition-colors last:border-b-0 hover:bg-paper-2 md:grid-cols-[2rem_14rem_1fr_2rem] md:gap-6 md:py-5',
        active && 'bg-paper-2',
      )}
      aria-pressed={active}
    >
      <span className="font-mono text-[12px] text-ink-3">
        {String(index + 1).padStart(2, '0')}
      </span>
      <TemplateCardTitle tpl={tpl} label={label} description={description} />
      <span className="hidden font-serif text-[14px] italic text-ink-2 md:inline">
        {sectionPreview}
      </span>
      <span className="flex justify-end">
        <span
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded-full border',
            active ? 'border-ink bg-ink' : 'border-rule bg-transparent',
          )}
          aria-hidden="true"
        >
          {active && <span className="h-1.5 w-1.5 rounded-full bg-paper" />}
        </span>
      </span>
    </button>
  );
};
