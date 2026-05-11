import { useCallback, useRef } from 'react';
import { Editor, type EditorMode } from '@/editor/EditorFacade';
import { db } from '@/db/db';
import type { Doc } from '@/db/schema';

interface WriteSurfaceProps {
  doc: Doc;
  mode: EditorMode;
}

export function WriteSurface({ doc, mode }: WriteSurfaceProps) {
  const docIdRef = useRef(doc.id);
  docIdRef.current = doc.id;

  const handleChange = useCallback(async (serialized: string) => {
    await db.docs.update(docIdRef.current, {
      body: serialized,
      updatedAt: Date.now(),
    });
  }, []);

  return (
    <div className="h-full overflow-auto bg-paper px-12 py-12">
      <Editor
        key={doc.id}
        initialValue={doc.body}
        onChange={handleChange}
        mode={mode}
        placeholder="Start writing…"
      />
    </div>
  );
}
