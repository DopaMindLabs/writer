import { useTemplatesForm } from '@/hooks/useTemplatesForm';
import { TemplatesHeader } from '@/components/templates/TemplatesHeader';
import { TemplatesBody } from '@/components/templates/TemplatesBody';
import { TemplatesFooter } from '@/components/templates/TemplatesFooter';
import { TemplatesNotice } from '@/components/templates/TemplatesNotice';

export const TemplatesScreen = () => {
  const {
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
        className="flex flex-1 flex-col"
      >
        <TemplatesBody
          templates={templates}
          selectedId={selectedId}
          templateLabel={templateLabel}
          templateDescription={templateDescription}
          onSelect={onSelect}
        />

        <TemplatesNotice lockReason={lockReason} submitError={submitError} />

        <TemplatesFooter
          name={name}
          tag={tag}
          submitting={submitting}
          canSubmit={Boolean(selected) && lockReason === 'none'}
          submitLabel={submitLabel}
          onNameChange={setName}
          onTagChange={setTag}
        />
      </form>
    </div>
  );
};
