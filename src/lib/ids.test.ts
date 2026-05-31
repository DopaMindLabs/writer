import { newId } from './ids';

describe('newId', () => {
  it('returns a 16-char string', () => {
    expect(newId()).toHaveLength(16);
  });

  it('uses only alphanumeric characters', () => {
    const id = newId();
    expect(id).toMatch(/^[0-9A-Za-z]{16}$/);
  });

  it('generates unique ids', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i += 1) seen.add(newId());
    expect(seen.size).toBe(1000);
  });
});
