/**
 * A cross-tab signal that a document's CRDT state was reset out-of-band — e.g. a
 * space backup restore, which clears and re-seeds the update log directly in
 * IndexedDB rather than through a provider. Other tabs with the document open
 * hold a stale in-memory `Y.Doc`; this channel tells them to reload the fresh
 * seed (by remounting the editor) so they don't clobber the restored body.
 */
const RELOAD_CHANNEL = 'lipsum-doc-reload';

/** Notify other tabs that these documents' CRDT state was reset. */
export const broadcastDocReload = (docIds: readonly string[]): void => {
  if (docIds.length === 0) return;
  const channel = new BroadcastChannel(RELOAD_CHANNEL);
  channel.postMessage([...docIds]);
  channel.close();
};

/** Subscribe to reload signals for one document; returns an unsubscribe. */
export const onDocReload = (
  docId: string,
  onReload: () => void,
): (() => void) => {
  const channel = new BroadcastChannel(RELOAD_CHANNEL);
  channel.onmessage = (event: MessageEvent) => {
    const ids: unknown = event.data;
    if (Array.isArray(ids) && ids.includes(docId)) onReload();
  };
  return () => {
    channel.close();
  };
};
