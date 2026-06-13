import { InlineBanner } from '@/components/ui/InlineBanner';
import { PdfCardUrlInput } from './PdfCardUrlInput';

interface PdfCardErrorProps {
  noteId: string;
  url: string;
  message: string;
  busy: boolean;
  onResubmit: (next: string) => void;
}

export const PdfCardError = ({
  noteId,
  url,
  message,
  busy,
  onResubmit,
}: PdfCardErrorProps) => (
  <>
    <InlineBanner
      kind="error"
      title="Couldn't fetch this PDF"
      data-testid={`brain-note-${noteId}-pdf-error`}
    >
      {message}
    </InlineBanner>
    <PdfCardUrlInput
      initialValue={url}
      busy={busy}
      onSubmit={onResubmit}
      testIdPrefix={`brain-note-${noteId}-pdf-url-retry`}
    />
  </>
);
