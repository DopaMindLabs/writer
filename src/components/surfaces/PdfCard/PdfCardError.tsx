import { InlineBanner } from '@/components/ui/InlineBanner';

interface PdfCardErrorProps {
  noteId: string;
  message: string;
  onEdit: () => void;
}

export const PdfCardError = ({ noteId, message, onEdit }: PdfCardErrorProps) => (
  <InlineBanner
    kind="error"
    title="Couldn't fetch this PDF"
    action="Edit source"
    onAction={onEdit}
    data-testid={`brain-note-${noteId}-pdf-error`}
  >
    {message}
  </InlineBanner>
);
