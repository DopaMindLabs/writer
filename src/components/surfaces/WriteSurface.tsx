import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Editor, type EditorMode } from '@/editor/EditorFacade';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { setDocStatus, updateDocBody } from '@/lib/docs';
import type { Doc } from '@/db/schema';
import { useUI, type ReadingWidth } from '@/store/ui';
import { useCollab } from '@/hooks/useCollab';
import { useDocCrdtReady } from '@/hooks/useDocCrdtReady';
import { useDocReloadNonce } from '@/hooks/useDocReloadNonce';
import { useEffectiveInspectorConfig } from '@/hooks/useDocInspectorConfig';
import {
  captureAutoRevision,
  captureBaselineRevision,
  resetAutoThrottle,
} from '@/lib/revisions';
import { cn } from '@/lib/utils';

interface WriteSurfaceProps {
  doc: Doc;
  mode: EditorMode;
  locked?: boolean;
}

const READING_WIDTH_MAX: Record<ReadingWidth, string> = {
  s: 'max-w-[560px]',
  m: 'max-w-[680px]',
  l: 'max-w-[860px]',
};

const LockBanner = ({ doc }: { doc: Doc }) => {
  const { t } = useTranslation('chrome');
  return (
    <InlineBanner
      kind="warning"
      title={t('inspector.lock.title')}
      action={t('inspector.lock.unlock')}
      onAction={() => {
        void setDocStatus(doc.id, 'draft');
      }}
      className="mb-6"
      data-testid="doc-lock-banner"
    >
      {t('inspector.lock.body')}
    </InlineBanner>
  );
};

export const WriteSurface = ({ doc, mode, locked = false }: WriteSurfaceProps) => {
  const readingWidth = useUI((s) => s.readingWidth);
  const collab = useCollab();
  const cursorsContainerRef = useRef<HTMLDivElement | null>(null);
  // Bumped when another tab resets this doc's CRDT state (e.g. backup restore),
  // remounting the editor so it reloads the fresh seed instead of a stale Y.Doc.
  const reloadNonce = useDocReloadNonce(doc.id);
  // Hold the editor back until the CRDT log is seeded — a doc whose log was wiped
  // (cloud sign-out) must not mount blank and autosave empty over its real body.
  const crdtReady = useDocCrdtReady(doc.id, doc.body);

  const { effective } = useEffectiveInspectorConfig(doc.spaceId);
  const highlightOn = effective.highlightOverLimit;
  const wordLimit =
    highlightOn && effective.wordLimit ? doc.meta.wordLimit : undefined;
  const charLimit =
    highlightOn && effective.charLimit ? doc.meta.charLimit : undefined;

  useEffect(() => {
    void captureBaselineRevision(doc.id, doc.body).catch((err: unknown) => {
      console.error('Failed to capture baseline revision', err);
    });
    return () => { resetAutoThrottle(doc.id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  const handleChange = useCallback((serialized: string) => {
    void updateDocBody(doc.id, serialized);
    void captureAutoRevision(doc.id, serialized).catch(
      (err: unknown) => {
        console.error('Failed to capture revision', err);
      },
    );
  }, [doc.id]);

  return (
    <div
      data-tour="tour-editor-main"
      data-reading-width={readingWidth}
      className="h-full min-w-0 flex-1 overflow-auto bg-paper px-6 py-12 md:px-12"
    >
      <div
        ref={cursorsContainerRef}
        data-testid="collab-cursors"
        className={cn('relative mx-auto w-full', READING_WIDTH_MAX[readingWidth])}
      >
        {locked && <LockBanner doc={doc} />}
        {collab && crdtReady && (
          <Editor
            key={`${doc.id}-${mode}-${String(reloadNonce)}`}
            docId={doc.id}
            providerFactory={collab.providerFactory}
            username={collab.username}
            cursorColor={collab.cursorColor}
            cursorsContainerRef={cursorsContainerRef}
            onChange={handleChange}
            mode={mode}
            locked={locked}
            wordLimit={wordLimit}
            charLimit={charLimit}
            placeholder="Start writing…"
          />
        )}
      </div>
    </div>
  );
};
