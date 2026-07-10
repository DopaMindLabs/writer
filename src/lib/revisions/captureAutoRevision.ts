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

const throttle = new Map<string, ThrottleEntry>();

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

  await createRevision(docId, body, { kind: 'auto', now });
  throttle.set(docId, { lastAt: at, lastText: text });
};
