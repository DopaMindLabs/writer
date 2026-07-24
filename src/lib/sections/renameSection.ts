import { db } from '@/db/db';
import { invariant } from '@/lib/invariant';

export const renameSection = async (
  sectionId: string,
  label: string,
): Promise<void> => {
  invariant(sectionId, 'renameSection: sectionId is required');
  const next = label.trim();
  if (!next) return;
  await db.sections.update(sectionId, { label: next });
};
