import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TypographyH1 } from '@/components/ui/typography';
import { EmptyState } from '@/components/ui/EmptyState';
import { MediaUploadButton } from '@/components/media/MediaUploadButton';
import { MediaCard } from '@/components/media/MediaCard';
import { useMediaItems } from '@/hooks/useMediaItems';
import { routes } from '@/lib/routes';
import type { MediaItem } from '@/db/schema';

interface MediaLibrarySurfaceProps {
  spaceId: string;
}

export const MediaLibrarySurface = ({ spaceId }: MediaLibrarySurfaceProps) => {
  const { t } = useTranslation('screens');
  const navigate = useNavigate();
  const items = useMediaItems(spaceId);

  const openMedia = (item: MediaItem): void => {
    void navigate(routes.mediaView(spaceId, item.id));
  };

  return (
    <section
      aria-labelledby="media-library-heading"
      className="mx-auto w-full max-w-5xl p-6"
    >
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <TypographyH1 variant="compact" id="media-library-heading">
          {t('mediaLibrary.heading')}
        </TypographyH1>
        <MediaUploadButton spaceId={spaceId} />
      </header>
      {items.length === 0 ? (
        <EmptyState
          data-testid="media-library-empty"
          caption={t('mediaLibrary.emptyCaption')}
        />
      ) : (
        <ul
          data-testid="media-library-grid"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((item) => (
            <li key={item.id}>
              <MediaCard item={item} onOpen={openMedia} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
