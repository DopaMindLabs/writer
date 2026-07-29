import { db } from '@/db/db';
import type { LoremDB } from '@/db/LoremDB';
import { invariant } from '@/lib/invariant';
import { deleteDocCascade } from '@/lib/docs';
import { isWorkshopSection } from './workshop';

/**
 * Permanently delete a section together with every document it contains — its
 * own documents and those of its subsections. Each document is removed through
 * {@link deleteDocCascade}, so its annotations, revisions, Brain Space links,
 * and collaborative CRDT state are cascaded too. The subsection rows and the
 * section row are deleted last.
 *
 * The Workshop section is reserved (it hosts the Brain Space link) and cannot
 * be deleted; a missing section id is a no-op.
 */
export const deleteSectionCascade = async (
  sectionId: string,
  database: LoremDB = db,
): Promise<void> => {
  invariant(sectionId, 'deleteSectionCascade: sectionId is required');
  const section = await database.sections.get(sectionId);
  if (!section) return;
  invariant(
    !isWorkshopSection(section),
    'deleteSectionCascade: the Workshop section cannot be deleted',
  );

  const subsectionIds = await database.sections
    .where('parentSectionId')
    .equals(sectionId)
    .primaryKeys();
  const sectionIds = [sectionId, ...subsectionIds];

  const docIds = await database.docs
    .where('sectionId')
    .anyOf(sectionIds)
    .primaryKeys();
  for (const docId of docIds) {
    await deleteDocCascade(docId, database);
  }

  await database.sections.bulkDelete(sectionIds);
};
