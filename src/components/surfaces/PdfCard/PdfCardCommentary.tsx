import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '@/db/db';
import { NoteState, type Note } from '@/db/schema';
import { TextArea } from '@/components/ui/TextArea';
import { cn } from '@/lib/utils';

interface PdfCardCommentaryProps {
  note: Note;
}

const useCommentaryEditing = (note: Note) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);

  useEffect(() => {
    if (!editing) setDraft(note.body);
  }, [note.body, editing]);

  const commit = async () => {
    setEditing(false);
    if (draft !== note.body) {
      await db.notes.update(note.id, { body: draft });
      if (note.state !== NoteState.User) {
        await db.notes.update(note.id, { state: NoteState.User });
      }
    }
  };

  const cancel = () => {
    setDraft(note.body);
    setEditing(false);
  };

  return { editing, setEditing, draft, setDraft, commit, cancel };
};

export const PdfCardCommentary = ({ note }: PdfCardCommentaryProps) => {
  const { t } = useTranslation('screens');
  const ed = useCommentaryEditing(note);
  if (ed.editing) {
    return (
      <TextArea
        variant="bare"
        autoFocus
        rows={undefined}
        value={ed.draft}
        onChange={(e) => { ed.setDraft(e.target.value); }}
        onBlur={() => { void ed.commit(); }}
        onKeyDown={(e) => { if (e.key === 'Escape') ed.cancel(); }}
        data-no-drag
        data-testid={`brain-note-${note.id}-body-input`}
        className="min-h-[28px] resize-none font-serif text-[12px] leading-snug text-ink-2"
      />
    );
  }
  return (
    <div
      onPointerDown={(e) => { e.stopPropagation(); }}
      onClick={() => { ed.setEditing(true); }}
      data-no-drag
      data-testid={`brain-note-${note.id}-body`}
      className={cn(
        'cursor-text whitespace-pre-wrap font-serif text-[12px] leading-snug text-ink-2',
        !note.body && 'text-ink-4',
      )}
    >
      {note.body || t('brainSpace.note.bodyEmpty')}
    </div>
  );
};
