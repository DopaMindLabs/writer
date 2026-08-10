import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { Sidebar } from '@/components/chrome/Sidebar';
import { Topbar } from '@/components/chrome/Topbar';
import { MobileTabs } from '@/components/chrome/MobileTabs';
import { MobileMoreSheet } from '@/components/chrome/MobileMore';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { TypographyMuted } from '@/components/ui/typography';
import { NotebookPageControls } from '@/components/writer-notebook/NotebookPageControls';
import { NotebookPageMenu } from '@/components/writer-notebook/NotebookPageMenu';
import { NotebookPageSurface } from '@/components/writer-notebook/NotebookPageSurface';
import { NotebookProcessingStatus } from '@/components/writer-notebook/NotebookProcessingStatus';
import { NotebookToolbar } from '@/components/writer-notebook/NotebookToolbar';
import { useWriterNotebookScreenModel } from '@/hooks/useWriterNotebookScreenModel';
import { routes } from '@/lib/routes';

export const WriterNotebookScreen = () => {
  const { t } = useTranslation('screens');
  const model = useWriterNotebookScreenModel();
  if (model.kind === 'invalid') return <Navigate to={routes.home()} replace />;
  if (model.kind === 'loading') {
    return <main id="main-content"><TypographyMuted>{t('notebook.loading')}</TypographyMuted></main>;
  }
  if (model.kind === 'not-found') return <Navigate to={routes.spaceWrite(model.spaceId)} replace />;
  const { spaceId, space, notebook, pages, assets, selection, importer, actions, lastDocId } = model;

  return (
    <div className="flex h-full w-full">
      <div className="hidden md:contents"><SpaceRail activeSpaceId={spaceId} /><Sidebar spaceId={spaceId} activeDocId={null} /></div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar surface="notebook" spaceId={spaceId} docId={null} docName={notebook.title} spaceName={space?.name} fallbackDocId={lastDocId} />
        <NotebookToolbar
          onFiles={importer.importFiles}
          disabled={importer.processing || model.atPageLimit}
          focusChoose={actions.focusAddAction}
        />
        <NotebookProcessingStatus processing={importer.processing} error={importer.error} />
        {actions.error ? <InlineBanner kind="error" title={t('notebook.pageActionError')}>{actions.error}</InlineBanner> : null}
        {selection.selected ? (
          <div className="flex items-center justify-between border-b border-rule bg-paper px-4 py-2">
            <NotebookPageControls pageNumber={model.pageIndex + 1} totalPages={pages.length} onPrevious={actions.previous} onNext={actions.next} />
            <NotebookPageMenu canMoveEarlier={actions.canMoveEarlier} canMoveLater={actions.canMoveLater} onRotate={actions.rotate} onMoveEarlier={actions.moveEarlier} onMoveLater={actions.moveLater} onDelete={actions.deletePage} />
          </div>
        ) : null}
        <NotebookPageSurface pages={pages} assets={assets} selected={selection.selected} source={model.source} vector={model.vector} pageIndex={model.pageIndex} focusPageId={actions.focusPageId} onSelect={selection.selectPage} />
        <MobileTabs spaceId={spaceId} docId={lastDocId} />
        <MobileMoreSheet spaceId={spaceId} docId={lastDocId} />
      </div>
    </div>
  );
};
