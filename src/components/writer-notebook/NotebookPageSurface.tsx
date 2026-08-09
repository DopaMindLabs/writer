import type { WriterNotebookAsset, WriterNotebookPage } from '@/db/schema';
import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { NotebookEmptyState } from './NotebookEmptyState';
import { NotebookPageRail } from './NotebookPageRail';
import { NotebookPageViewer } from './NotebookPageViewer';

interface NotebookPageSurfaceProps {
  readonly pages: readonly WriterNotebookPage[];
  readonly assets: readonly WriterNotebookAsset[];
  readonly selected: WriterNotebookPage | undefined;
  readonly source: WriterNotebookAsset | undefined;
  readonly vector: WriterNotebookAsset | undefined;
  readonly pageIndex: number;
  readonly focusPageId: string | null;
  readonly onSelect: (pageId: string) => void;
}

export const NotebookPageSurface = (props: NotebookPageSurfaceProps) => {
  const { t } = useTranslation('screens');
  const rail = props.pages.length > 0
    ? <NotebookPageRail pages={props.pages} assets={props.assets} selectedPageId={props.selected?.id ?? null} focusPageId={props.focusPageId} onSelect={props.onSelect} />
    : null;
  let page = <NotebookEmptyState />;
  if (props.selected && props.source) {
    page = <NotebookPageViewer blob={props.source.blob} vectorBlob={props.vector?.blob} pageNumber={props.pageIndex + 1} rotation={props.selected.rotation} />;
  } else if (props.pages.length > 0) {
    page = <InlineBanner kind="error">{t('notebook.pageUnavailable')}</InlineBanner>;
  }
  return <main id="main-content" tabIndex={-1} className="flex min-h-0 flex-1 flex-col overflow-hidden bg-paper md:flex-row">{rail}{page}</main>;
};
