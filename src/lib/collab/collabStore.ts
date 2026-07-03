import { createDexieCollabStore } from './yjs/DexieCollabStore';

/**
 * The app-wide {@link CollabStore} singleton. It is stateless (a thin wrapper
 * over `db`), so a single instance is shared by the document facade (seed at
 * creation) and, later, the collaboration provider.
 */
export const collabStore = createDexieCollabStore();
