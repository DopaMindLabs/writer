import { useCallback, useRef } from 'react';
import { Editor, type EditorMode } from '@/editor/EditorFacade';
import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import { useUI, type ReadingWidth } from '@/store/ui';
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

  const handleChange = useCallback((serialized: string) => {
    void db.docs.update(docIdRef.current, {
      body: serialized,
      updatedAt: Date.now(),
    });
  }, []);

  return (
    <div
      data-tour="tour-editor-main"
      data-reading-width={readingWidth}
      className="h-full min-w-0 flex-1 overflow-auto bg-paper px-6 py-12 md:px-12"
    >
      <div className={cn('mx-auto w-full', READING_WIDTH_MAX[readingWidth])}>
        <Editor
          key={`${doc.id}-${mode}`}
          initialValue={doc.body}
          onChange={handleChange}
          mode={mode}
          placeholder="Start writing…"
        />
      </div>
    </div>
  );
};
