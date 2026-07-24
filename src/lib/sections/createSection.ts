import { db } from '@/db/db';
import { newId } from '@/lib/ids';

/**
 * Create a new top-level section in a space at the given order and return its id.
 * Subsections are not created here — the sidebar renders a flat section list.
 */
export const createSection = async (
  spaceId: string,
  label: string,
  order: number,
): Promise<string> => {
  const id = newId();
  await db.sections.add({
    id,
    spaceId,
    parentSectionId: null,
    label,
    order,
  });
  return id;
};
