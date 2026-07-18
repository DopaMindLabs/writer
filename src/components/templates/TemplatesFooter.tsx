import { TemplatesFooterFields } from './TemplatesFooterFields';
import { TemplatesFooterActions } from './TemplatesFooterActions';

export interface TemplatesFooterProps {
  name: string;
  tag: string;
  submitting: boolean;
  canSubmit: boolean;
  submitLabel: string;
  onNameChange: (value: string) => void;
  onTagChange: (value: string) => void;
}

/** The sticky New-space footer: name/tag fields above the submit control. */
export const TemplatesFooter = ({
  name,
  tag,
  submitting,
  canSubmit,
  submitLabel,
  onNameChange,
  onTagChange,
}: TemplatesFooterProps) => (
  <div className="sticky bottom-0 z-10 border-t border-rule bg-paper">
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-4 md:gap-6 md:px-12 md:py-6">
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
