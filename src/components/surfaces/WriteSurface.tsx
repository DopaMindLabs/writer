import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Editor, type EditorMode } from '@/editor/EditorFacade';
import { useDocSyncSession } from '@/editor/collab/useDocSyncSession';
import { countWords } from '@/editor/wordCount';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import { useUI, type ReadingWidth } from '@/store/ui';
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
        void db.docs.update(doc.id, {
          'meta.status': 'draft',
          updatedAt: Date.now(),
        });
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
  const restoreNonce = useUI((s) => s.restoreNonces[doc.id] ?? 0);

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
    void db.docs.update(doc.id, {
      body: serialized,
      updatedAt: Date.now(),
      'meta.wordCount': countWords(serialized),
    });
    void captureAutoRevision(doc.id, serialized).catch(
      (err: unknown) => {
        console.error('Failed to capture revision', err);
      },
    );
  }, [doc.id]);

  const session = useDocSyncSession(doc.id, restoreNonce);

  return (
    <div
      data-tour="tour-editor-main"
      data-reading-width={readingWidth}
      className="h-full min-w-0 flex-1 overflow-auto bg-paper px-6 py-12 md:px-12"
    >
      <div className={cn('mx-auto w-full', READING_WIDTH_MAX[readingWidth])}>
        {locked && <LockBanner doc={doc} />}
        {session && (
          <Editor
            key={`${doc.id}-${mode}-${String(restoreNonce)}-${session.key}`}
            session={session}
            initialSerialized={doc.body}
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
