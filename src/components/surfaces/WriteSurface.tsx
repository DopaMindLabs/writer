import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Editor, type EditorMode } from '@/editor/EditorFacade';
import { InlineBanner } from '@/components/ui/InlineBanner';
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
  /** Read-only because the document's status is a locked stage. */
  locked?: boolean;
}

const READING_WIDTH_MAX: Record<ReadingWidth, string> = {
  s: 'max-w-[560px]',
  m: 'max-w-[680px]',
  l: 'max-w-[860px]',
};

export const WriteSurface = ({ doc, mode, locked = false }: WriteSurfaceProps) => {
  const { t } = useTranslation('chrome');
  const docIdRef = useRef(doc.id);
  docIdRef.current = doc.id;
  const readingWidth = useUI((s) => s.readingWidth);
  const restoreNonce = useUI((s) => s.restoreNonces[doc.id] ?? 0);

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
        {locked && (
          <InlineBanner
            kind="warning"
            title={t('inspector.lock.title')}
            action={t('inspector.lock.unlock')}
            onAction={() => {
              void db.docs.update(doc.id, {
                meta: { ...doc.meta, status: 'draft' },
                updatedAt: Date.now(),
              });
            }}
            className="mb-6"
            data-testid="doc-lock-banner"
          >
            {t('inspector.lock.body')}
          </InlineBanner>
        )}
        <Editor
          key={`${doc.id}-${mode}-${String(restoreNonce)}`}
          initialValue={doc.body}
          onChange={handleChange}
          mode={mode}
          locked={locked}
          placeholder="Start writing…"
        />
      </div>
    </div>
  );
};
