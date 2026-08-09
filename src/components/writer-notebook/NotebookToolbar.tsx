import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { FileInputTrigger } from '@/components/ui/FileInputTrigger';
import { SUPPORTED_PAGE_IMAGE_MIME_TYPES } from 'writer-notebook/browser';

interface NotebookToolbarProps {
  readonly onFiles: (files: File[]) => void;
  readonly disabled: boolean;
  readonly focusChoose?: boolean;
}

const ACCEPTED_IMAGES = SUPPORTED_PAGE_IMAGE_MIME_TYPES.join(',');

export const NotebookToolbar = ({ onFiles, disabled, focusChoose = false }: NotebookToolbarProps) => {
  const { t } = useTranslation('screens');
  const chooseButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (focusChoose) chooseButton.current?.focus();
  }, [focusChoose]);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-paper px-4 py-2">
      <FileInputTrigger
        accept={ACCEPTED_IMAGES}
        multiple
        disabled={disabled}
        onPick={onFiles}
        data-testid="notebook-choose-photos-input"
      >
        {(open) => <Button ref={chooseButton} kind="secondary" size="sm" onClick={open}>{t('notebook.choosePhotos')}</Button>}
      </FileInputTrigger>
      <FileInputTrigger
        accept={ACCEPTED_IMAGES}
        capture="environment"
        disabled={disabled}
        onPick={onFiles}
        data-testid="notebook-take-photo-input"
      >
        {(open) => <Button kind="secondary" size="sm" onClick={open}>{t('notebook.takePhoto')}</Button>}
      </FileInputTrigger>
    </div>
  );
};
