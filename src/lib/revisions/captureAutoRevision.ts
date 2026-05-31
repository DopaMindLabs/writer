import { db } from '@/db/db';
import {
  AUTO_REVISION_MIN_INTERVAL_MS,
  createRevision,
} from './createRevision';
import { lexicalJsonToPlainText } from './lexicalJsonToPlainText';

// Per-document throttle state for automatic captures. Bounded by the number of
// open documents and cleared on doc switch via resetAutoThrottle; not an
// unbounded cache.
interface ThrottleEntry {
  lastAt: number;
  lastText: string;
}

const throttle = new Map<string, ThrottleEntry>();

// Clears throttle state for one document, or all of them when no id is given
// (used on document switch and between tests).
export const resetAutoThrottle = (docId?: string): void => {
  if (docId === undefined) {
    throttle.clear();
    return;
  }
  throttle.delete(docId);
};

// Records the first snapshot for a freshly opened document, so its history
// always has a starting point to diff against. No-op if a baseline (or any
// revision) already exists for the doc.
export const captureBaselineRevision = async (
  docId: string,
  body: string,
  now: () => number = Date.now,
): Promise<void> => {
  const existing = await db.revisions.where('docId').equals(docId).count();
  if (existing > 0) {
    throttle.set(docId, { lastAt: now(), lastText: lexicalJsonToPlainText(body) });
    return;
  }
  await createRevision(docId, body, { kind: 'baseline', now });
  throttle.set(docId, { lastAt: now(), lastText: lexicalJsonToPlainText(body) });
};

// Best-effort automatic capture. Skips when the last capture was within the
// minimum interval, or when the document text has not changed since then.
export const captureAutoRevision = async (
  docId: string,
  body: string,
  now: () => number = Date.now,
): Promise<void> => {
  const text = lexicalJsonToPlainText(body);
  const prev = throttle.get(docId);
  const at = now();

  if (prev && at - prev.lastAt < AUTO_REVISION_MIN_INTERVAL_MS) return;
  if (prev?.lastText === text) {
    throttle.set(docId, { lastAt: at, lastText: text });
    return;
  }

  await createRevision(docId, body, { kind: 'auto', now });
  throttle.set(docId, { lastAt: at, lastText: text });
};
