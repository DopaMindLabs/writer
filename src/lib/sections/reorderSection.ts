import { db } from '@/db/db';
import { invariant } from '@/lib/invariant';

/**
 * Move a top-level section to a new position among its siblings and renumber the
 * whole top-level list densely (0..n-1). Subsections are untouched; an unknown
 * section id is a no-op. `toIndex` is clamped to the sibling count.
 */
export const reorderSection = async (
  sectionId: string,
  toIndex: number,
): Promise<void> => {
  invariant(sectionId, 'reorderSection: sectionId is required');
  await db.transaction('rw', db.sections, async () => {
    const section = await db.sections.get(sectionId);
    if (section?.parentSectionId !== null) return;
    const tops = (await db.sections.where('spaceId').equals(section.spaceId).toArray())
      .filter((s) => s.parentSectionId === null && s.id !== sectionId)
      .sort((a, b) => a.order - b.order);
    const index = Math.max(0, Math.min(toIndex, tops.length));
    tops.splice(index, 0, section);
    for (let i = 0; i < tops.length; i += 1) {
      await db.sections.update(tops[i].id, { order: i });
    }
  });
};
