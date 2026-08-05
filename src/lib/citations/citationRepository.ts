import { db } from '@/db/db';
import type { Citation } from '@/db/schema';
import {
  currentPrincipal,
  touchedMetadataFields,
} from '@/lib/writerSyncIntegration/writerEntityMetadata';

/**
 * Writes to the `citations` table that span more than one row.
 *
 * Each citation is a material change in its own right, so each takes its own
 * operation id and logical time — reusing them would journal operations the
 * other devices have already accepted, and the retype would never replicate.
 * The principal resolves before the transaction opens: awaiting anything but a
 * Dexie promise inside one leaves its zone.
 */
export const setCitationsType = async (
  ids: readonly string[],
  type: Citation['type'],
): Promise<void> => {
  if (ids.length === 0) return;
  const principal = await currentPrincipal();
  await db.transaction('rw', db.citations, async () => {
    for (const id of ids) {
      await db.citations.update(id, { type, ...touchedMetadataFields(principal) });
    }
  });
};
