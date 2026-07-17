import { useCallback, useRef } from 'react';
import { Editor, type EditorMode } from '@/editor/EditorFacade';
import { updateDocBody } from '@/lib/docs';
import type { Doc } from '@/db/schema';
import { useUI, type ReadingWidth } from '@/store/ui';
import { useCollab } from '@/hooks/useCollab';
import { useDocCrdtReady } from '@/hooks/useDocCrdtReady';
import { useDocReloadNonce } from '@/hooks/useDocReloadNonce';
import { useEffectiveInspectorConfig } from '@/hooks/useDocInspectorConfig';
import { useMountBaselineRevision } from '@/hooks/useMountBaselineRevision';
import { captureAutoRevision } from '@/lib/revisions';
import { cn } from '@/lib/utils';
import { appLogger } from '@/lib/appLogger';
import { LockBanner } from './LockBanner';

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

export const WriteSurface = ({ doc, mode, locked = false }: WriteSurfaceProps) => {
  const readingWidth = useUI((s) => s.readingWidth);
  const collab = useCollab();
  const cursorsContainerRef = useRef<HTMLDivElement | null>(null);
  // Bumped when another tab resets this doc's CRDT state (e.g. backup restore),
  // remounting the editor so it reloads the fresh seed instead of a stale Y.Doc.
  const reloadNonce = useDocReloadNonce(doc.id);
  // Hold the editor back until the CRDT log is seeded — a doc whose log was wiped
  // (cloud sign-out) must not mount blank and autosave empty over its real body.
  const crdtReady = useDocCrdtReady(doc.id, doc.body, doc.updatedAt);

  const { effective } = useEffectiveInspectorConfig(doc.spaceId);
  const highlightOn = effective.highlightOverLimit;
  const wordLimit =
    highlightOn && effective.wordLimit ? doc.meta.wordLimit : undefined;
  const charLimit =
    highlightOn && effective.charLimit ? doc.meta.charLimit : undefined;

  useMountBaselineRevision(doc.id, doc.body);

  const handleChange = useCallback(async (serialized: string) => {
    // Await the body write so the autosave flush only records the save once it
    // has landed; a failure propagates and leaves the edit pending for retry.
    await updateDocBody(doc.id, serialized);
    // Revision capture is best-effort and must never mask a body-write failure.
    void captureAutoRevision(doc.id, serialized).catch(
      (err: unknown) => {
        appLogger.error('Failed to capture revision', err);
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
            // The body persisted at this mount seeds the autosave baseline, so a
            // freshly-seeded clean editor is not mistaken for one with unsaved
            // edits by cloud reconciliation. The editor is keyed above, so this is
            // captured once per mount and a later pull does not move the baseline.
            persistedBody={doc.body}
            wordLimit={wordLimit}
            charLimit={charLimit}
            placeholder="Start writing…"
          />
        )}
      </div>
    </div>
  );
};
