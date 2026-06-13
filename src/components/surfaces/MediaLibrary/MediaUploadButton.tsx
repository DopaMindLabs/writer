import { AlertCircle } from '@/components/libs/icons';
import { FileInputTrigger } from '@/components/ui/FileInputTrigger';
import { Button } from '@/components/ui/Button';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { useUploadPdf } from './useUploadPdf';

interface MediaUploadButtonProps {
  spaceId: string;
  onUploaded?: (mediaItemId: string) => void;
}

export const MediaUploadButton = ({
  spaceId,
  onUploaded,
}: MediaUploadButtonProps) => {
  const { error, busy, upload } = useUploadPdf(spaceId, onUploaded);
  return (
    <div className="flex flex-col gap-2">
      <FileInputTrigger
        accept="application/pdf"
        disabled={busy}
        onPick={(files) => { void upload(files); }}
        data-testid="media-upload-input"
      >
        {(open) => (
          <Button
            kind="primary"
            size="sm"
            onClick={open}
            disabled={busy}
            data-testid="media-upload-button"
          >
            {busy ? 'Uploading…' : 'Upload PDF'}
          </Button>
        )}
      </FileInputTrigger>
      {error !== null ? (
        <InlineBanner
          kind="error"
          icon={AlertCircle}
          title="Upload failed"
          data-testid="media-upload-error"
        >
          {error}
        </InlineBanner>
      ) : null}
    </div>
  );
};
