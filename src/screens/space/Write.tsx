import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { Sidebar } from '@/components/chrome/Sidebar';
import { FocusRail } from '@/components/chrome/FocusRail';
import { Topbar } from '@/components/chrome/Topbar';
import { WriteSurface } from '@/components/surfaces/WriteSurface';
import { CitationsSidePanel } from '@/components/surfaces/CitationsSidePanel';
import { DocInspector } from '@/components/chrome/DocInspector';
import { DocInspectorIcons } from '@/components/chrome/DocInspectorIcons';
import { VersionHistoryModal } from '@/components/chrome/VersionHistoryModal';
import { SaveVersionDialog } from '@/components/chrome/SaveVersionDialog';
import { MobileTabs } from '@/components/chrome/MobileTabs';
import { MobileMoreSheet } from '@/components/chrome/MobileMore';
import { useSpace } from '@/hooks/useSpaces';
import { useSections, useDocuments, useDocument } from '@/hooks/useDocuments';
import { useUI, type InspectorMode } from '@/store/ui';
import { isLockedStatus } from '@/lib/docInspector/status';
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

  const redirect = resolveFirstDocRedirect(spaceId, docId, sections, docs);
  useAssertedRedirect(redirect.to);

  useEffect(() => {
    if (spaceId) setCurrentSpaceId(spaceId);
  }, [spaceId, setCurrentSpaceId]);

  useEffect(() => {
    setCurrentDocId(docId ?? null);
  }, [docId, setCurrentDocId]);

  if (!spaceId) return <Navigate to={routes.home()} replace />;

  const editorMode = focus ? 'focus' : 'write';
  const contentLoading = redirect.loading || isSelectedDocLoading(docId, doc, docs);

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
        {doc && <VersionHistoryModal doc={doc} />}
        {doc && <SaveVersionDialog docId={doc.id} />}
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
 * Where the space root should land while the screen waits at `/s/:spaceId`.
 * `loading` covers the window before the live queries resolve. Pure — the
 * navigation itself is asserted by {@link useAssertedRedirect}.
 */
const resolveFirstDocRedirect = (
  spaceId: string | undefined,
  docId: string | undefined,
  sections: Section[] | undefined,
  docs: Doc[] | undefined,
): { to: string | null; loading: boolean } => {
  if (docId || !spaceId) return { to: null, loading: false };
  if (sections === undefined || docs === undefined) {
    return { to: null, loading: true };
  }
  const firstDocId = pickFirstDocId(sections, docs);
  return firstDocId
    ? { to: routes.docWrite(spaceId, firstDocId), loading: true }
    : { to: null, loading: false };
};

/**
 * Assert the redirect once per `(target, location)` pair. Two failure modes
 * shape this:
 *
 * - A `to`-memoised effect (or `<Navigate>`, which memoises on `to`) drops the
 *   navigation when a hash re-entry to `/s/:spaceId` cancels the router
 *   transition without `to` changing — the screen hangs on "Loading space…".
 *   Stamping with `location.key` re-arms the redirect on every router
 *   transition, so a replayed entry always re-fires it.
 * - An unguarded every-commit `navigate` storms under load: the router wraps
 *   transitions in `startTransition`, so several commits can land before the
 *   params update, each firing another navigation. The stamp makes the assert
 *   idempotent per location.
 */
const useAssertedRedirect = (to: string | null): void => {
  const navigate = useNavigate();
  const location = useLocation();
  const asserted = useRef<string | null>(null);
  useEffect(() => {
    if (!to) return;
    const stamp = `${to}@${location.key}`;
    if (asserted.current === stamp) return;
    asserted.current = stamp;
    void navigate(to, { replace: true });
  });
};

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
  if (doc)
    return (
      <WriteSurface
        doc={doc}
        mode={editorMode}
        locked={isLockedStatus(doc.meta.status)}
      />
    );
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
  return <DocInspector docName={doc.name} docId={doc.id} />;
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
