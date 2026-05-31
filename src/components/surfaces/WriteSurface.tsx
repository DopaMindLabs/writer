import { useCallback, useEffect, useRef, useState } from 'react';
import { Editor, type EditorMode } from '@/editor/EditorFacade';
import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import { useUI, type ReadingWidth } from '@/store/ui';
import {
  captureAutoRevision,
  captureBaselineRevision,
  resetAutoThrottle,
} from '@/lib/revisions';
import { cn } from '@/lib/utils';

interface WriteSurfaceProps {
  doc: Doc;
  mode: EditorMode;
}

const READING_WIDTH_MAX: Record<ReadingWidth, string> = {
  s: 'max-w-[560px]',
  m: 'max-w-[680px]',
  l: 'max-w-[860px]',
};

export const WriteSurface = ({ doc, mode }: WriteSurfaceProps) => {
  const docIdRef = useRef(doc.id);
  docIdRef.current = doc.id;
  const readingWidth = useUI((s) => s.readingWidth);

  // The editor is uncontrolled (key-remounted on initialValue change). We must
  // remount when the body changes from *outside* the editor (e.g. a restore),
  // but NOT for the editor's own autosaves, which would drop the caret. Track
  // the last body the editor itself emitted; when the live doc.body differs,
  // bump a nonce to force a remount that re-reads the restored content.
  const lastEmittedRef = useRef(doc.body);
  const [restoreNonce, setRestoreNonce] = useState(0);
  useEffect(() => {
    if (doc.body !== lastEmittedRef.current) {
      lastEmittedRef.current = doc.body;
      setRestoreNonce((n) => n + 1);
    }
  }, [doc.body]);

  // Record a starting snapshot when a document is opened, and clear the
  // auto-capture throttle so the next document starts fresh.
  useEffect(() => {
    void captureBaselineRevision(doc.id, doc.body).catch((err: unknown) => {
      console.error('Failed to capture baseline revision', err);
    });
    return () => { resetAutoThrottle(doc.id); };
    // Keyed on doc.id only: we want the baseline at open time, not on every
    // body change (auto-capture in handleChange covers ongoing edits).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  const handleChange = useCallback((serialized: string) => {
    lastEmittedRef.current = serialized;
    void db.docs.update(docIdRef.current, {
      body: serialized,
      updatedAt: Date.now(),
    });
    // Best-effort, throttled history capture; never blocks or throws into the
    // editor's onChange.
    void captureAutoRevision(docIdRef.current, serialized).catch(
      (err: unknown) => {
        console.error('Failed to capture revision', err);
      },
    );
  }, []);

  return (
    <div
      data-tour="tour-editor-main"
      data-reading-width={readingWidth}
      className="h-full min-w-0 flex-1 overflow-auto bg-paper px-6 py-12 md:px-12"
    >
      <div className={cn('mx-auto w-full', READING_WIDTH_MAX[readingWidth])}>
        <Editor
          key={`${doc.id}-${mode}-${String(restoreNonce)}`}
          initialValue={doc.body}
          onChange={handleChange}
          mode={mode}
          placeholder="Start writing…"
        />
      </div>
    </div>
  );
};
