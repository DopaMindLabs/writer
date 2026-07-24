import { getTemplate, listTemplates, templateAllowsConfiguration } from './index';
import type { Template } from './types';

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
      const ao = a.pickerOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = b.pickerOrder ?? Number.MAX_SAFE_INTEGER;
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
      .filter((title): title is string => Boolean(title));
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

describe('templateAllowsConfiguration', () => {
  it('defaults to true for every shipped template', () => {
    for (const template of listTemplates()) {
      expect(templateAllowsConfiguration(template)).toBe(true);
    }
  });

  it('is true for the Blank template', () => {
    expect(templateAllowsConfiguration(getTemplate('blank'))).toBe(true);
  });

  it('is true for structured templates (sections are user-managed by default)', () => {
    expect(templateAllowsConfiguration(getTemplate('fiction'))).toBe(true);
    expect(templateAllowsConfiguration(getTemplate('humanities'))).toBe(true);
    expect(templateAllowsConfiguration(getTemplate('technical'))).toBe(true);
    expect(templateAllowsConfiguration(getTemplate('bioinformatics'))).toBe(true);
  });

  it('is false only when a template opts out with allowConfiguration: false', () => {
    const locked = { allowConfiguration: false } as Template;
    expect(templateAllowsConfiguration(locked)).toBe(false);
  });

  it('treats a missing template as not configurable', () => {
    expect(templateAllowsConfiguration(undefined)).toBe(false);
  });
});
