/**
 * The single-seeder rule. The Stage 2 local seed guard is per-device and cannot
 * arbitrate across devices that have never synced: two devices holding the same
 * `Doc.body` (a restored backup, or two users with a common earlier copy) would
 * each seed independently, and Yjs would merge two unrelated full-text insertions
 * into **duplicated content**.
 *
 * So a room's Y.Doc is seeded **exactly once, by the share creator at share
 * time**. Every joiner starts from an empty Y.Doc and converges via sync — even
 * if it holds a local body — and that pre-existing body is preserved as a
 * revision rather than merged. The seeding authority lives in the `shares` row
 * (`seededBy`), which travels in the user's own backups, so a restored device
 * takes the joiner path even with an empty local log. Relay state is **never**
 * consulted — it can be wiped.
 */
import type { Share } from '@/db/schema';
import { captureBaselineRevision } from '@/lib/revisions/captureAutoRevision';

/** Whether this device is the room's recorded seeder (the share creator). */
export const isRoomSeeder = (share: Share, selfAuthorId: string): boolean =>
  share.seededBy === selfAuthorId;

/** The seed path a device takes for a room doc: seed once, or join from empty. */
export type SeedRole = 'seeder' | 'joiner';

export const roomSeedRole = (share: Share, selfAuthorId: string): SeedRole =>
  isRoomSeeder(share, selfAuthorId) ? 'seeder' : 'joiner';

/**
 * Whether to plant a CRDT seed for a doc. A non-room doc (no share) follows the
 * Stage 2 default and seeds locally; a room doc is seeded only by its recorded
 * seeder. The decision reads the `shares` row alone — never the local log or the
 * relay — so it is stable across restores.
 */
export const shouldSeedDoc = (share: Share | null, selfAuthorId: string): boolean =>
  share === null || isRoomSeeder(share, selfAuthorId);

/**
 * Before a joiner starts from empty, keep any pre-existing local body recoverable
 * by capturing it as a baseline revision. It is preserved, never merged — merging
 * would duplicate content across the two independent copies.
 */
export const preserveLocalBodyForJoiner = async (
  docId: string,
  localBody: string | null,
): Promise<void> => {
  if (localBody === null) return;
  await captureBaselineRevision(docId, localBody);
};
