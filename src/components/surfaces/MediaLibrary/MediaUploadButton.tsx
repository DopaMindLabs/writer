import { useState } from 'react';
import { FileInputTrigger } from '@/components/ui/FileInputTrigger';
import { Button } from '@/components/ui/Button';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { addMediaItem, validatePdfFile } from '@/lib/media';

interface MediaUploadButtonProps {
  spaceId: string;
  onUploaded?: (mediaItemId: string) => void;
}

export const MediaUploadButton = ({
  spaceId,
  onUploaded,
}: MediaUploadButtonProps) => {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handlePick = async (files: File[]) => {
    if (files.length === 0) return;
    const [file] = files;
    setBusy(true);
    setError(null);
    const result = await validatePdfFile(file);
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
      return;
    }
    const blob = new Blob([await file.arrayBuffer()], {
      type: 'application/pdf',
    });
    const item = await addMediaItem(spaceId, file.name, blob);
    setBusy(false);
    onUploaded?.(item.id);
  };

  return (
    <div className="flex flex-col gap-2">
      <FileInputTrigger
        accept="application/pdf"
        disabled={busy}
        onPick={(files) => { void handlePick(files); }}
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
        <InlineBanner kind="error" title="Upload failed" data-testid="media-upload-error">
          {error}
        </InlineBanner>
      ) : null}
    </div>
  );
};
