import { useTranslation } from 'react-i18next';
import { FileText } from '@/components/libs/icons';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/icon';
import { FileInputTrigger } from '@/components/ui/FileInputTrigger';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { TypographyP } from '@/components/ui/typography';
import { PDF_ACCEPT_ATTR } from '@/data/media';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import type { MediaItem } from '@/db/schema';

interface MediaUploadButtonProps {
  spaceId: string;
  onUploaded?: (item: MediaItem) => void;
}

export const MediaUploadButton = ({ spaceId, onUploaded }: MediaUploadButtonProps) => {
  const { t } = useTranslation('screens');
  const { busy, rejected, uploadFiles, dismissRejected } =
    useMediaUpload(spaceId, onUploaded);

  return (
    <div className="flex flex-col items-start gap-1.5">
      {rejected.length > 0 && (
        <InlineBanner
          kind="warning"
          dismissible
          onDismiss={dismissRejected}
          className="w-full"
          data-testid="media-upload-reject-banner"
        >
          {rejected.join('; ')}
        </InlineBanner>
      )}
      <FileInputTrigger
        accept={PDF_ACCEPT_ATTR}
        multiple
        disabled={busy}
        onPick={uploadFiles}
        data-testid="media-upload-input"
      >
        {(open) => (
          <Button
            kind="secondary"
            size="sm"
            disabled={busy}
            onClick={open}
            data-testid="media-upload-button"
          >
            <Icon icon={FileText} size="xs" />
            {t('mediaLibrary.upload.action')}
          </Button>
        )}
      </FileInputTrigger>
      <TypographyP
        variant="caption"
        aria-live="polite"
        data-testid="media-upload-status"
      >
        {busy ? t('mediaLibrary.upload.busy') : ''}
      </TypographyP>
    </div>
  );
};
