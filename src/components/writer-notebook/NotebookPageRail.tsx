import { useTranslation } from 'react-i18next';
import type { WriterNotebookAsset, WriterNotebookPage } from '@/db/schema';
import { NotebookPageThumbnail } from './NotebookPageThumbnail';

interface NotebookPageRailProps {
  readonly pages: readonly WriterNotebookPage[];
  readonly assets: readonly WriterNotebookAsset[];
  readonly selectedPageId: string | null;
  readonly focusPageId?: string | null;
  readonly onSelect: (pageId: string) => void;
}

export const NotebookPageRail = ({ pages, assets, selectedPageId, focusPageId, onSelect }: NotebookPageRailProps) => {
  const { t } = useTranslation('screens');
  return (
    <nav aria-label={t('notebook.pageRail')} className="flex shrink-0 gap-2 overflow-auto border-b border-rule bg-paper-2 p-2 md:w-24 md:flex-col md:border-b-0 md:border-r">
      {pages.map((page, index) => {
        const thumbnail = assets.find(({ id }) => id === page.thumbnailAssetId);
        return thumbnail ? (
          <NotebookPageThumbnail
            key={page.id}
            blob={thumbnail.blob}
            pageNumber={index + 1}
            selected={page.id === selectedPageId}
            focusWhenSelected={page.id === focusPageId}
            onSelect={() => { onSelect(page.id); }}
          />
        ) : null;
      })}
    </nav>
  );
};
