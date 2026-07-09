import { useTranslation } from 'react-i18next';
import { Eyebrow } from '@/components/ui/Eyebrow';

/**
 * The dashed drop target shown over the library while a file is dragged onto the
 * page. Pointer-transparent so it never intercepts the drop it invites.
 */
export const MediaLibraryDropOverlay = () => {
  const { t } = useTranslation('screens');

  return (
    <div
      data-testid="media-library-drop-overlay"
      className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center border border-dashed border-ink-4 bg-paper/90"
    >
      <Eyebrow className="text-ink">{t('mediaLibrary.list.dropHint')}</Eyebrow>
    </div>
  );
};
