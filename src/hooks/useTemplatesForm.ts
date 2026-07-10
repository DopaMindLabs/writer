import { useMemo, useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listTemplates, type Template } from '@/data/templates';
import { createSpaceFromTemplate } from '@/db/seed';
import { routes } from '@/lib/routes';
import { isCloudKeyError } from '@/lib/cloud/crypto/errors';
import { useCloudLockReason } from '@/hooks/useCloudLockReason';
import type { TemplatesSubmitError } from '@/components/templates/TemplatesNotice';

/** The i18n-aware label, tag and description resolvers for a template. */
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

interface TemplateSubmitParams {
  selected: Template | undefined;
  name: string;
  tag: string;
  templateLabel: (tpl: Template) => string;
  templateTag: (tpl: Template) => string;
}

/** Owns the submit lifecycle: creating the space and navigating into it. */
const useTemplateSubmit = ({
  selected,
  name,
  tag,
  templateLabel,
  templateTag,
}: TemplateSubmitParams) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<TemplatesSubmitError>(null);
  const navigate = useNavigate();

  const submitTemplate = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const cleanTag =
        tag.trim().slice(0, 3).toUpperCase() || templateTag(selected);
      const cleanName = name.trim() || templateLabel(selected);
      const newId = await createSpaceFromTemplate(selected, cleanName, cleanTag);
      void navigate(routes.spaceWrite(newId));
    } catch (error) {
      setSubmitError(isCloudKeyError(error) ? 'locked' : 'failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submitTemplate();
  };

  return { submitting, submitError, onSubmit };
};

/** State and handlers backing the New-space (Templates) screen. */
export const useTemplatesForm = () => {
  const { t, templateLabel, templateTag, templateDescription } =
    useTemplateLabels();
  const templates = useMemo(() => listTemplates(), []);

  const [selectedId, setSelectedId] = useState<string>(templates[0]?.id ?? '');
  const selected = templates.find((tpl) => tpl.id === selectedId);
  const [name, setName] = useState<string>(selected ? templateLabel(selected) : '');
  const [tag, setTag] = useState<string>(selected ? templateTag(selected) : '');

  const onSelect = (tpl: Template) => {
    setSelectedId(tpl.id);
    setName(templateLabel(tpl));
    setTag(templateTag(tpl));
  };

  const { submitting, submitError, onSubmit } = useTemplateSubmit({
    selected,
    name,
    tag,
    templateLabel,
    templateTag,
  });
  const lockReason = useCloudLockReason();

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
    submitError,
    lockReason,
    submitLabel,
    templateLabel,
    templateDescription,
    onSelect,
    onSubmit,
    setName,
    setTag,
  };
};
