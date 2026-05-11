import { db } from './db';
import { newId } from '@/lib/ids';
import { getTemplate, type Template } from '@/data/templates';

const SEEDED_KEY = 'seeded';
const DEFAULT_TEMPLATE_ID = 'bioinformatics';

export async function createWorldFromTemplate(
  template: Template,
  name?: string,
): Promise<string> {
  const worldId = newId();
  const now = Date.now();
  const sectionIds = new Map<string, string>();

  await db.transaction(
    'rw',
    [db.worlds, db.sections, db.docs],
    async () => {
      await db.worlds.add({
        id: worldId,
        tag: template.tag,
        name: name ?? template.label,
        shared: false,
        template: template.id,
        createdAt: now,
        updatedAt: now,
      });

      for (const section of template.sections) {
        const sectionId = newId();
        sectionIds.set(section.label, sectionId);
        await db.sections.add({
          id: sectionId,
          worldId,
          label: section.label,
          order: section.order,
        });
      }

      for (const docDef of template.seedDocs) {
        const sectionId = sectionIds.get(docDef.sectionLabel);
        if (!sectionId) continue;
        await db.docs.add({
          id: newId(),
          worldId,
          sectionId,
          name: docDef.name,
          body: docDef.body ?? '',
          meta: { wordCount: 0 },
          updatedAt: now,
        });
      }
    },
  );

  return worldId;
}

export async function seedIfEmpty(): Promise<void> {
  const marker = await db.meta.get(SEEDED_KEY);
  if (marker?.value === true) return;

  const template = getTemplate(DEFAULT_TEMPLATE_ID);
  if (!template) {
    throw new Error(
      `Default template "${DEFAULT_TEMPLATE_ID}" not found in registry`,
    );
  }

  await createWorldFromTemplate(template);

  await db.settings.put({
    key: 'global',
    proseFont: 'Source Serif 4',
    uiFont: 'Geist',
    proseSize: 17,
    lineHeight: 1.6,
    measure: 68,
    theme: 'light',
  });

  await db.meta.put({ key: SEEDED_KEY, value: true });
}

export async function resetAndReseed(): Promise<void> {
  await db.delete();
  await db.open();
  await seedIfEmpty();
}
