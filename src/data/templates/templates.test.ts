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

describe('getTemplate', () => {
  it('returns a matching template by id', () => {
    expect(getTemplate('blank')?.id).toBe('blank');
    expect(getTemplate('bioinformatics')?.id).toBe('bioinformatics');
  });

  it('returns undefined for unknown id', () => {
    expect(getTemplate('does-not-exist')).toBeUndefined();
  });
});
