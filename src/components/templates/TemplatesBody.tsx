import { useTranslation } from 'react-i18next';
import type { Template } from '@/data/templates';
import { TypographyH1 } from '@/components/ui/typography';
import { TemplateCard } from './TemplateCard';

export interface TemplatesBodyProps {
  templates: Template[];
  selectedId: string;
  templateLabel: (tpl: Template) => string;
  templateDescription: (tpl: Template) => string | undefined;
  onSelect: (tpl: Template) => void;
}

/** The heading and the list of selectable template cards. */
export const TemplatesBody = ({
  templates,
  selectedId,
  templateLabel,
  templateDescription,
  onSelect,
}: TemplatesBodyProps) => {
  const { t } = useTranslation('screens');
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-6 pb-8 md:gap-12 md:px-12 md:pt-16 md:pb-12">
      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          {t('templates.crumb')}
        </div>
        <TypographyH1 variant="page">
          {t('templates.headingMain')}{' '}
          <span className="italic font-light text-ink-2">
            {t('templates.headingAccent')}
          </span>
        </TypographyH1>
      </div>

      <fieldset className="border-y border-rule">
        <legend className="sr-only">{t('templates.chooseLegend')}</legend>
        {templates.map((tpl, i) => (
          <TemplateCard
            key={tpl.id}
            tpl={tpl}
            index={i}
            active={tpl.id === selectedId}
            label={templateLabel(tpl)}
            description={templateDescription(tpl)}
            onSelect={onSelect}
          />
        ))}
      </fieldset>
    </div>
  );
};
