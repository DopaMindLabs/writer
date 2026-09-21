import { formatChord } from './formatChord';

const apple = { platform: 'MacIntel' };
const linux = { platform: 'Linux x86_64' };

describe('shortcuts/formatChord', () => {
  it('runs the Command glyph into the key on Apple platforms', () => {
    expect(formatChord('mod+\\', apple)).toBe('⌘\\');
    expect(formatChord('mod+,', apple)).toBe('⌘,');
  });

  it('joins Ctrl and the key with + elsewhere', () => {
    expect(formatChord('mod+\\', linux)).toBe('Ctrl+\\');
    expect(formatChord('mod+,', linux)).toBe('Ctrl+,');
  });

  it('resolves shift, alt and enter per platform', () => {
    expect(formatChord('mod+shift+m', apple)).toBe('⌘⇧M');
    expect(formatChord('mod+shift+m', linux)).toBe('Ctrl+Shift+M');
    expect(formatChord('alt+s', apple)).toBe('⌥S');
    expect(formatChord('alt+s', linux)).toBe('Alt+S');
    expect(formatChord('mod+enter', apple)).toBe('⌘⏎');
    expect(formatChord('mod+enter', linux)).toBe('Ctrl+Enter');
  });

  it('upper-cases a single letter and passes longer tokens through', () => {
    expect(formatChord('mod+e', linux)).toBe('Ctrl+E');
    expect(formatChord('?', linux)).toBe('?');
    expect(formatChord('Esc', apple)).toBe('Esc');
  });

  it('reads the running platform when no navigator is injected', () => {
    // jsdom reports no Apple platform, so the default resolves to Ctrl.
    expect(formatChord('mod+k')).toBe('Ctrl+K');
  });
});
