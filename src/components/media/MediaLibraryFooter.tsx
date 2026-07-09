import { useTranslation, Trans } from 'react-i18next';
import { Eyebrow } from '@/components/ui/Eyebrow';

interface MediaLibraryFooterProps {
  shown: number;
  total: number;
}

/** The library footer: how many rows are shown of the total (and the drop hint),
 * with a reminder that filing into the brain space is optional. */
export const MediaLibraryFooter = ({ shown, total }: MediaLibraryFooterProps) => {
  const { t } = useTranslation('screens');

  return (
    <footer className="mt-4 flex flex-wrap items-center justify-between gap-2">
      <Eyebrow data-testid="media-library-footer-count" className="text-ink-4">
        {t('mediaLibrary.list.footerShowing', { shown, total })}
      </Eyebrow>
      <Eyebrow className="text-ink-4">
        <Trans
          i18nKey="mediaLibrary.list.footerBrainSpace"
          ns="screens"
          components={{ strong: <strong className="font-normal text-ink" /> }}
        />
      </Eyebrow>
    </footer>
  );
};
