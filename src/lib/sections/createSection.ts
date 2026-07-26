import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import { invariant } from '@/lib/invariant';
import {
  currentPrincipal,
  newEntityMetadata,
} from '@/lib/writerSync/writerEntityMetadata';
import { isWorkshopLabel } from './workshop';

/**
 * Create a new top-level section in a space at the given order and return its id.
 * Subsections are not created here — the sidebar renders a flat section list.
 * The Workshop label is reserved so a user section cannot impersonate the
 * space's protected Workshop.
 */
export const createSection = async (
  spaceId: string,
  label: string,
  order: number,
): Promise<string> => {
  invariant(
    !isWorkshopLabel(label.trim()),
    'createSection: "Workshop" is a reserved section label',
  );
  const id = newId();
  await db.sections.add({
    // A section's access scope is the space it belongs to.
    ...newEntityMetadata(spaceId, await currentPrincipal()),
    id,
    spaceId,
    parentSectionId: null,
    label,
    order,
  });
  return id;
};
