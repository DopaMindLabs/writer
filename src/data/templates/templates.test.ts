import { getTemplate, listTemplates } from './index';

describe('listTemplates', () => {
  it('returns only enabled templates', () => {
    const list = listTemplates();
    expect(list.length).toBeGreaterThan(0);
    for (const t of list) expect(t.enabled).toBe(true);
  });

  it('sorts by pickerOrder then label', () => {
    const list = listTemplates();
    for (let i = 1; i < list.length; i += 1) {
      const a = list[i - 1];
      const b = list[i];
      const ao = a.pickerOrder;
      const bo = b.pickerOrder;
      if (ao === bo) {
        expect(a.label.localeCompare(b.label)).toBeLessThanOrEqual(0);
      } else {
        expect(ao).toBeLessThanOrEqual(bo);
      }
    }
  });
});

describe('seed wording', () => {
  it('uses numbered chapters for fiction manuscript seeds', () => {
    const fiction = getTemplate('fiction');
    const manuscript = (fiction?.seedDocs ?? []).filter(
      (d) => d.sectionLabel === 'Manuscript',
    );
    expect(manuscript.map((d) => d.name)).toEqual([
      'Chapter 01',
      'Chapter 02',
      'Chapter 03',
    ]);
    for (const doc of manuscript) expect(doc.name).toMatch(/^Chapter \d{2}$/);
  });

  it('uses generic names for humanities seeds', () => {
    const humanities = getTemplate('humanities');
    expect((humanities?.seedDocs ?? []).map((d) => d.name)).toEqual([
      'Introduction',
      'Chapter 01',
      'Outline',
      'Primary sources',
      'Secondary sources',
      'Thesis',
      'Counter-arguments',
      'Open questions',
      'Sessions',
    ]);
  });

  it('uses generic placeholder titles for fiction seed notes', () => {
    const fiction = getTemplate('fiction');
    const titles = (fiction?.seedNotes ?? [])
      .map((n) => n.title)
      .filter((title) => title !== '');
    expect(titles).toEqual([
      'Character — Name',
      'Place — Name',
      'Lore — A rule of the world',
      'Character — Another name',
    ]);
  });
});

describe('getTemplate', () => {
  it('returns a matching template by id', () => {
    expect(getTemplate('blank')?.id).toBe('blank');
    expect(getTemplate('bioinformatics')?.id).toBe('bioinformatics');
  });

  it('returns undefined for unknown id', () => {
    expect(getTemplate('does-not-exist')).toBeUndefined();
  });
});

describe('allowConfiguration', () => {
  it('is set true on every shipped template (sections are user-managed by default)', () => {
    for (const template of listTemplates()) {
      expect(template.allowConfiguration).toBe(true);
    }
  });

  it('is present as a boolean on each template looked up by id', () => {
    expect(getTemplate('blank')?.allowConfiguration).toBe(true);
    expect(getTemplate('fiction')?.allowConfiguration).toBe(true);
    expect(getTemplate('humanities')?.allowConfiguration).toBe(true);
    expect(getTemplate('technical')?.allowConfiguration).toBe(true);
    expect(getTemplate('bioinformatics')?.allowConfiguration).toBe(true);
  });
});
