import { Blob as NodeBlob } from 'node:buffer';

// fake-indexeddb clones stored values with Node's structuredClone, which
// degrades jsdom Blobs to empty objects; Node's own Blob survives the clone,
// so tests that round-trip Blobs through Dexie need it as the global.
// This must run before Dexie is imported anywhere: Dexie snapshots the
// global Blob constructor at load time for its deep-clone intrinsic set,
// and Blobs of any other constructor get brand-stripped by liveQuery.
(globalThis as { Blob: typeof globalThis.Blob }).Blob =
  NodeBlob as unknown as typeof globalThis.Blob;
