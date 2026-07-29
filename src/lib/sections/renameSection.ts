import { db } from '@/db/db';
import { invariant } from '@/lib/invariant';
import { isWorkshopLabel } from './workshop';

export const renameSection = async (
  sectionId: string,
  label: string,
): Promise<void> => {
  invariant(sectionId, 'renameSection: sectionId is required');
  const next = label.trim();
  if (!next) return;
  // The Workshop label is reserved for the protected Workshop section.
  invariant(
    !isWorkshopLabel(next),
    'renameSection: "Workshop" is a reserved section label',
  );
  await db.sections.update(sectionId, { label: next });
};
