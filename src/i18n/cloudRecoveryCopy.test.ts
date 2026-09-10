import { describe, it, expect } from 'vitest';
import screens from './locales/en/screens.json';
import app from './locales/en/app.json';

/**
 * ADHD-first copy rule: the cloud recovery and conflict surfaces must never leak
 * internal vocabulary. These words belong in the design docs, not in front of a
 * user resolving a problem. Guards the copy this feature introduced (the
 * pre-existing privacy disclosure keeps its own deliberate wording).
 */
const FORBIDDEN = ['escrow', 'fingerprint', 'reconcile', 'crdt', 'key'];

const stringsUnder = (value: unknown, out: string[] = []): string[] => {
  if (typeof value === 'string') out.push(value);
  else if (value && typeof value === 'object') {
    for (const child of Object.values(value)) stringsUnder(child, out);
  }
  return out;
};

const cloud = (
  screens as {
    settings: { cloud: { conflict: unknown } };
  }
).settings.cloud;

const recoveryStrings = [
  ...stringsUnder(cloud.conflict),
  ...Object.entries(app as Record<string, string>)
    .filter(([key]) => key.startsWith('cloudKeyError') || key.startsWith('routeError'))
    .map(([, value]) => value),
];

describe('cloud recovery copy', () => {
  it.each(FORBIDDEN)('never puts the word "%s" in front of the user', (word) => {
    const offenders = recoveryStrings.filter((s) =>
      new RegExp(`\\b${word}\\b`, 'i').test(s),
    );
    expect(offenders).toEqual([]);
  });
});
