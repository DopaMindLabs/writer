import { useTemplatesForm } from '@/hooks/useTemplatesForm';
import { TemplatesHeader } from '@/components/templates/TemplatesHeader';
import { TemplatesBody } from '@/components/templates/TemplatesBody';
import { TemplatesFooter } from '@/components/templates/TemplatesFooter';

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
        className="flex flex-1 flex-col"
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
