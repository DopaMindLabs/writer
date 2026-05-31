import { useMemo, useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from '@/components/libs/icons';
import { listTemplates, type Template } from '@/data/templates';
import { TemplateStage } from '@/data/templates/types';
import { createSpaceFromTemplate } from '@/db/seed';
import { cn } from '@/lib/utils';
import { Link } from '@/components/ui/Link';
import { TextField } from '@/components/ui/TextField';
import { Label } from '@/components/ui/Label';
import { TypographyH1 } from '@/components/ui/typography';
import { routes } from '@/lib/routes';

interface TemplateCardProps {
  tpl: Template;
  index: number;
  active: boolean;
  label: string;
  description?: string;
  onSelect: (tpl: Template) => void;
}

const TemplateCardTitle = ({
  tpl,
  label,
  description,
}: {
  tpl: Template;
  label: string;
  description?: string;
}) => (
  <span className="flex flex-col">
    <span className="font-serif text-[18px] leading-tight text-ink">
      {label}
      {tpl.stage && tpl.stage !== TemplateStage.Stable && (
        <span className="ml-2 inline-block rounded-sm border border-rule px-1 py-0.5 align-middle font-mono text-[9px] uppercase tracking-wider text-ink-3">
          {tpl.stage}
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

const TemplateCard = ({
  tpl,
  index,
  active,
  label,
  description,
  onSelect,
}: TemplateCardProps) => {
  const sectionPreview = tpl.sections.map((s) => s.label).join(' · ');
  return (
    // @lint-ignore native-button: large card-style radio row with multi-column grid content; not a DS Button kind
    <button
      data-testid={`templates-card-${tpl.id}`}
      type="button"
      onClick={() => { onSelect(tpl); }}
      className={cn(
        'grid w-full grid-cols-[1.5rem_1fr_2rem] items-baseline gap-4 border-b border-rule px-2 py-5 text-left transition-colors last:border-b-0 hover:bg-paper-2 md:grid-cols-[2rem_14rem_1fr_2rem] md:gap-6',
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

interface TemplatesFooterProps {
  name: string;
  tag: string;
  submitting: boolean;
  canSubmit: boolean;
  submitLabel: string;
  onNameChange: (value: string) => void;
  onTagChange: (value: string) => void;
}

const TemplatesFooterFields = ({
  name,
  tag,
  onNameChange,
  onTagChange,
}: Pick<TemplatesFooterProps, 'name' | 'tag' | 'onNameChange' | 'onTagChange'>) => {
  const { t } = useTranslation('screens');
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem] sm:gap-6">
      <div>
        <Label
          htmlFor="space-name"
          tone="ink3"
          weight="regular"
          className="block font-mono text-[10px] uppercase tracking-[0.08em]"
        >
          {t('templates.nameLabel')}
        </Label>
        <TextField
          id="space-name"
          data-testid="templates-name-input"
          value={name}
          onChange={(e) => { onNameChange(e.target.value); }}
          className="mt-1 h-10 py-0 font-serif text-[22px] leading-none"
        />
      </div>
      <div>
        <Label
          htmlFor="space-tag"
          tone="ink3"
          weight="regular"
          className="block font-mono text-[10px] uppercase tracking-[0.08em]"
        >
          {t('templates.tagLabel')}
        </Label>
        <TextField
          id="space-tag"
          data-testid="templates-tag-input"
          maxLength={3}
          value={tag}
          onChange={(e) => { onTagChange(e.target.value.toUpperCase()); }}
          className="mt-1 h-10 py-0 text-center font-mono text-[18px] leading-none tracking-widest"
        />
      </div>
    </div>
  );
};

const TemplatesFooterActions = ({
  submitting,
  canSubmit,
  submitLabel,
}: Pick<TemplatesFooterProps, 'submitting' | 'canSubmit' | 'submitLabel'>) => {
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
      {/* @lint-ignore native-button: italic-serif submit treatment unique to Templates; DS Button ghost is sans + thin underline and visually wrong here */}
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

const TemplatesFooter = ({
  name,
  tag,
  submitting,
  canSubmit,
  submitLabel,
  onNameChange,
  onTagChange,
}: TemplatesFooterProps) => (
  <div className="sticky bottom-0 z-10 border-t border-rule bg-paper">
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-12">
      <TemplatesFooterFields
        name={name}
        tag={tag}
        onNameChange={onNameChange}
        onTagChange={onTagChange}
      />
      <TemplatesFooterActions
        submitting={submitting}
        canSubmit={canSubmit}
        submitLabel={submitLabel}
      />
    </div>
  </div>
);

const TemplatesHeader = () => {
  const { t } = useTranslation('screens');
  return (
    <header className="flex items-center justify-between border-b border-rule px-4 py-4 md:px-12 md:py-5">
      <Link
        data-testid="templates-back"
        to={routes.home()}
        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="h-3 w-3" />
        {t('templates.back')}
      </Link>
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
        {t('templates.newSpace')}
      </div>
    </header>
  );
};

interface TemplatesBodyProps {
  templates: Template[];
  selectedId: string;
  templateLabel: (tpl: Template) => string;
  templateDescription: (tpl: Template) => string | undefined;
  onSelect: (tpl: Template) => void;
}

const TemplatesBody = ({
  templates,
  selectedId,
  templateLabel,
  templateDescription,
  onSelect,
}: TemplatesBodyProps) => {
  const { t } = useTranslation('screens');
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-4 pt-10 pb-12 md:px-12 md:pt-16">
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

const useTemplateLabels = () => {
  const { t } = useTranslation(['screens', 'templates']);
  const templateLabel = (tpl: Template) =>
    t(`${tpl.id}.label`, { ns: 'templates', defaultValue: tpl.label });
  const templateTag = (tpl: Template) =>
    t(`${tpl.id}.tag`, { ns: 'templates', defaultValue: tpl.tag });
  const templateDescription = (tpl: Template) =>
    tpl.description
      ? t(`${tpl.id}.description`, { ns: 'templates', defaultValue: tpl.description })
      : undefined;
  return { t, templateLabel, templateTag, templateDescription };
};

const useTemplatesForm = () => {
  const { t, templateLabel, templateTag, templateDescription } =
    useTemplateLabels();
  const templates = useMemo(() => listTemplates(), []);

  const [selectedId, setSelectedId] = useState<string>(
    templates[0]?.id ?? '',
  );
  const selected = templates.find((tpl) => tpl.id === selectedId);
  const [name, setName] = useState<string>(
    selected ? templateLabel(selected) : '',
  );
  const [tag, setTag] = useState<string>(
    selected ? templateTag(selected) : '',
  );
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const onSelect = (tpl: Template) => {
    setSelectedId(tpl.id);
    setName(templateLabel(tpl));
    setTag(templateTag(tpl));
  };

  const submitTemplate = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      const cleanTag =
        tag.trim().slice(0, 3).toUpperCase() || templateTag(selected);
      const cleanName = name.trim() || templateLabel(selected);
      const newId = await createSpaceFromTemplate(selected, cleanName, cleanTag);
      void navigate(routes.spaceWrite(newId));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submitTemplate();
  };

  const submitLabel = t('templates.submitLabel', {
    name: name.trim() || (selected ? templateLabel(selected) : '…'),
  });

  return {
    templates,
    selectedId,
    selected,
    name,
    tag,
    submitting,
    submitLabel,
    templateLabel,
    templateDescription,
    onSelect,
    onSubmit,
    setName,
    setTag,
  };
};

export const TemplatesScreen = () => {
  const {
    templates,
    selectedId,
    selected,
    name,
    tag,
    submitting,
    submitLabel,
    templateLabel,
    templateDescription,
    onSelect,
    onSubmit,
    setName,
    setTag,
  } = useTemplatesForm();

  return (
    <div
      data-testid="templates-screen"
      className="flex h-full w-full flex-col overflow-auto bg-paper"
    >
      <TemplatesHeader />

      <form
        id="main-content"
        tabIndex={-1}
        onSubmit={onSubmit}
        className="flex flex-1 flex-col outline-none"
      >
        <TemplatesBody
          templates={templates}
          selectedId={selectedId}
          templateLabel={templateLabel}
          templateDescription={templateDescription}
          onSelect={onSelect}
        />

        <TemplatesFooter
          name={name}
          tag={tag}
          submitting={submitting}
          canSubmit={Boolean(selected)}
          submitLabel={submitLabel}
          onNameChange={setName}
          onTagChange={setTag}
        />
      </form>
    </div>
  );
};
