import Dexie from 'dexie';
import { db } from '@/db/db';
import {
  AUTO_REVISION_MIN_INTERVAL_MS,
  createRevision,
} from './createRevision';
import { lexicalJsonToPlainText } from './lexicalJsonToPlainText';

interface ThrottleEntry {
  lastAt: number;
  lastText: string;
}

/**
 * Per-tab fast-path throttle. It spares a database read on the common case
 * (rapid edits within one tab) but cannot see what other tabs have written —
 * each browsing context holds its own Map. Cross-tab deduplication is the job
 * of {@link latestRevisionText}, which consults the shared revision store.
 */
const throttle = new Map<string, ThrottleEntry>();

/**
 * The plain text of the doc's most recent revision (any kind), or null when it
 * has none. Uses the `[docId+createdAt]` index so only the newest row is read.
 */
const latestRevisionText = async (docId: string): Promise<string | null> => {
  const latest = await db.revisions
    .where('[docId+createdAt]')
    .between([docId, Dexie.minKey], [docId, Dexie.maxKey])
    .last();
  return latest ? latest.text : null;
};

export const resetAutoThrottle = (docId?: string): void => {
  if (docId === undefined) {
    throttle.clear();
    return;
  }
  throttle.delete(docId);
};

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

  // Cross-tab guard: another tab (with its own empty Map) may have already
  // stored this exact content. Skip the duplicate and sync the local fast-path.
  if ((await latestRevisionText(docId)) === text) {
    throttle.set(docId, { lastAt: at, lastText: text });
    return;
  }

  await createRevision(docId, body, { kind: 'auto', now });
  throttle.set(docId, { lastAt: at, lastText: text });
};
