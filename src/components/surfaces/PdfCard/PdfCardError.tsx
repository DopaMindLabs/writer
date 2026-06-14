import { AlertCircle } from '@/components/libs/icons';
import { InlineBanner } from '@/components/ui/InlineBanner';

interface PdfCardErrorProps {
  noteId: string;
  message: string;
  onEdit: () => void;
}

export const PdfCardError = ({ noteId, message, onEdit }: PdfCardErrorProps) => (
  <div
    data-no-drag
    onPointerDown={(e) => { e.stopPropagation(); }}
  >
    <InlineBanner
      kind="error"
      icon={AlertCircle}
      title="Couldn't fetch this PDF"
      action="Edit source"
      onAction={onEdit}
      data-testid={`brain-note-${noteId}-pdf-error`}
    >
      {message}
    </InlineBanner>
  </div>
);
