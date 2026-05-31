import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { Sidebar } from '@/components/chrome/Sidebar';
import { FocusRail } from '@/components/chrome/FocusRail';
import { Topbar } from '@/components/chrome/Topbar';
import { WriteSurface } from '@/components/surfaces/WriteSurface';
import { CitationsSidePanel } from '@/components/surfaces/CitationsSidePanel';
import { DocInspector } from '@/components/chrome/DocInspector';
import { DocInspectorIcons } from '@/components/chrome/DocInspectorIcons';
import { MobileTabs } from '@/components/chrome/MobileTabs';
import { MobileMoreSheet } from '@/components/chrome/MobileMoreSheet';
import { useSpace } from '@/hooks/useSpaces';
import { useSections, useDocuments, useDocument } from '@/hooks/useDocuments';
import { useUI, type InspectorMode } from '@/store/ui';
import type { Doc, Section } from '@/db/schema';
import { TypographyMuted, TypographyP } from '@/components/ui/typography';
import { useAutoTour } from '@/tours';
import { routes } from '@/lib/routes';

export const WriteScreen = () => {
  const { spaceId, docId } = useParams<{ spaceId: string; docId?: string }>();
  const [searchParams] = useSearchParams();
  const focus = searchParams.get('focus') === '1';
  const space = useSpace(spaceId);
  const sections = useSections(spaceId);
  const docs = useDocuments(spaceId);
  const doc = useDocument(docId);
  const setCurrentSpaceId = useUI((s) => s.setCurrentSpaceId);
  const setCurrentDocId = useUI((s) => s.setCurrentDocId);
  const citationsDrawerOpen = useUI((s) => s.citationsDrawerOpen);
  const inspectorMode = useUI((s) => s.inspectorMode);

  useAutoTour('writer', { ready: !focus && !!doc });

  // Redirect `/s/:spaceId` to its first document imperatively. Returning a
  // <Navigate> element here would unmount the whole screen (rails, sidebar,
  // topbar) for a frame and remount it after the redirect — perceived as the
  // page "reloading" on every space switch. An effect keeps the chrome mounted.
  const redirecting = useFirstDocRedirect(spaceId, docId, sections, docs);

  useEffect(() => {
    if (spaceId) setCurrentSpaceId(spaceId);
  }, [spaceId, setCurrentSpaceId]);

  useEffect(() => {
    setCurrentDocId(docId ?? null);
  }, [docId, setCurrentDocId]);

  if (!spaceId) return <Navigate to={routes.home()} replace />;

  const editorMode = focus ? 'focus' : 'write';
  const contentLoading = redirecting || isSelectedDocLoading(docId, doc, docs);

  return (
    <div className="flex h-full w-full">
      <WriteRails spaceId={spaceId} docId={docId} focus={focus} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          spaceId={spaceId}
          docId={docId ?? null}
          docName={doc?.name}
          spaceName={space?.name}
          mode={editorMode}
        />
        <main id="main-content" tabIndex={-1} className="flex flex-1 overflow-hidden">
          <WriteEditorArea
            doc={doc}
            editorMode={editorMode}
            loading={contentLoading}
          />
          <CitationsSidePanel spaceId={spaceId} />
          <WriteInspector
            doc={doc}
            inspectorMode={inspectorMode}
            citationsDrawerOpen={citationsDrawerOpen}
            focus={focus}
          />
        </main>
        <WriteMobileChrome spaceId={spaceId} docId={docId} focus={focus} />
      </div>
    </div>
  );
};

const WriteMobileChrome = ({
  spaceId,
  docId,
  focus,
}: {
  spaceId: string;
  docId: string | undefined;
  focus: boolean;
}) => {
  if (focus) return null;
  return (
    <>
      <MobileTabs spaceId={spaceId} docId={docId ?? null} />
      <MobileMoreSheet spaceId={spaceId} docId={docId ?? null} />
    </>
  );
};

const WriteRails = ({
  spaceId,
  docId,
  focus,
}: {
  spaceId: string;
  docId: string | undefined;
  focus: boolean;
}) => (
  <div className="hidden md:contents">
    {focus ? (
      <FocusRail activeSpaceId={spaceId} />
    ) : (
      <>
        <SpaceRail activeSpaceId={spaceId} />
        <Sidebar spaceId={spaceId} activeDocId={docId ?? null} />
      </>
    )}
  </div>
);

const pickFirstDocId = (
  sections: Section[],
  docs: Doc[],
): string | undefined => {
  if (sections.length === 0 || docs.length === 0) return undefined;
  const orderedSections = [...sections].sort((a, b) => a.order - b.order);
  const firstSection =
    orderedSections.find((s) => s.parentSectionId === null) ??
    orderedSections[0];
  const firstDoc = docs.find((d) => d.sectionId === firstSection.id) ?? docs[0];
  return firstDoc.id;
};

/**
 * When `/s/:spaceId` has no doc selected, redirect to the space's first
 * document once its data has loaded. The redirect runs in an effect (rather
 * than by returning <Navigate>) so the surrounding chrome stays mounted across
 * the switch. Returns whether a redirect is pending, so the caller can show a
 * loading indicator instead of flashing the empty state.
 */
const useFirstDocRedirect = (
  spaceId: string | undefined,
  docId: string | undefined,
  sections: Section[] | undefined,
  docs: Doc[] | undefined,
): boolean => {
  const navigate = useNavigate();
  const dataReady = sections !== undefined && docs !== undefined;
  const firstDocId =
    !docId && dataReady ? pickFirstDocId(sections, docs) : undefined;
  useEffect(() => {
    if (spaceId && firstDocId) {
      void navigate(routes.docWrite(spaceId, firstDocId), { replace: true });
    }
  }, [spaceId, firstDocId, navigate]);
  return !docId && (!dataReady || firstDocId !== undefined);
};

/**
 * The selected document is still loading while its query resolves. A docId
 * absent from the loaded list is treated as genuinely missing (e.g. a stale
 * URL) rather than loading forever.
 */
const isSelectedDocLoading = (
  docId: string | undefined,
  doc: Doc | undefined,
  docs: Doc[] | undefined,
): boolean => {
  if (!docId || doc) return false;
  return docs === undefined || docs.some((d) => d.id === docId);
};

const WriteEditorArea = ({
  doc,
  editorMode,
  loading,
}: {
  doc: Doc | undefined;
  editorMode: 'focus' | 'write';
  loading: boolean;
}) => {
  if (doc) return <WriteSurface doc={doc} mode={editorMode} />;
  if (loading) return <LoadingState />;
  return <EmptyState />;
};

const WriteInspector = ({
  doc,
  inspectorMode,
  citationsDrawerOpen,
  focus,
}: {
  doc: Doc | undefined;
  inspectorMode: InspectorMode;
  citationsDrawerOpen: boolean;
  focus: boolean;
}) => {
  if (focus || !doc || citationsDrawerOpen || inspectorMode === 'none') {
    return null;
  }
  if (inspectorMode === 'icons') return <DocInspectorIcons />;
  return <DocInspector docName={doc.name} />;
};

const EmptyState = () => {
  return (
    <div className="flex h-full min-w-0 flex-1 items-center justify-center text-ink-3">
      <div className="text-center">
        <TypographyP variant="empty">Empty space</TypographyP>
        <TypographyMuted className="mt-2">
          Pick a document from the sidebar to start writing.
        </TypographyMuted>
      </div>
    </div>
  );
};

const LoadingState = () => {
  const { t } = useTranslation('screens');
  return (
    <div
      data-testid="write-loading"
      aria-live="polite"
      className="flex h-full min-w-0 flex-1 items-center justify-center"
    >
      <TypographyP variant="caption">{t('settings.space.loading')}</TypographyP>
    </div>
  );
};
