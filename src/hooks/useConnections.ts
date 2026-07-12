import { db } from '@/db/db';
import type { Connection } from '@/db/schema';
import { useEncryptedLiveQuery } from './useEncryptedLiveQuery';

export const useConnections = (
  spaceId: string | null | undefined,
): Connection[] => {
  return useEncryptedLiveQuery(
    async () => {
      if (!spaceId) return [];
      return db.connections.where('spaceId').equals(spaceId).toArray();
    },
    [spaceId],
    [],
  );
};

export interface NoteConnections {
  incoming: Connection[];
  outgoing: Connection[];
}

const EMPTY_CONNECTIONS: NoteConnections = { incoming: [], outgoing: [] };

export const useConnectionsForNote = (
  noteId: string | null | undefined,
): NoteConnections => {
  return useEncryptedLiveQuery(
    async () => {
      if (!noteId) return EMPTY_CONNECTIONS;
      const [outgoing, incoming] = await Promise.all([
        db.connections.where('fromNoteId').equals(noteId).toArray(),
        db.connections.where('toNoteId').equals(noteId).toArray(),
      ]);
      return { incoming, outgoing };
    },
    [noteId],
    EMPTY_CONNECTIONS,
  );
};
