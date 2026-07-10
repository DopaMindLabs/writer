import { BW, HL_COLORS, MONO, SANS, SERIF } from './tokens';

describe('theme/tokens', () => {
  it('exports CSS variable references', () => {
    expect(BW.paper).toBe('var(--paper)');
    expect(BW.ink).toBe('var(--ink)');
    expect(HL_COLORS.yellow).toBe('var(--hl-yellow)');
    expect(HL_COLORS.ash).toBe('var(--hl-ash)');
  });

  it('exports font stacks', () => {
    expect(SERIF).toContain('Source Serif');
    expect(SANS).toContain('Geist');
    expect(MONO).toContain('Geist Mono');
  });
});
