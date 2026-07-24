import { useTranslation } from 'react-i18next';
import type { Template } from '@/data/templates';
import { TemplateStage } from '@/data/templates/types';

export interface TemplateCardTitleProps {
  tpl: Template;
  label: string;
  description?: string;
}

/** The label, optional stage chip and blurb inside a template card. */
export const TemplateCardTitle = ({
  tpl,
  label,
  description,
}: TemplateCardTitleProps) => {
  const { t } = useTranslation('screens');
  return (
    <span className="flex flex-col">
      <span className="font-serif text-[18px] leading-tight text-ink">
        {label}
        {tpl.stage !== TemplateStage.Stable && (
          <span className="ml-2 inline-block rounded-sm border border-rule px-1 py-0.5 align-middle font-mono text-[9px] uppercase tracking-wider text-ink-3">
            {t(`templates.stage.${tpl.stage}`)}
          </span>
        )}
      </span>
      {description && (
        <span className="mt-1 font-serif text-[13px] italic text-ink-3">
          {description}
        </span>
      )}
    </span>
  );
};
