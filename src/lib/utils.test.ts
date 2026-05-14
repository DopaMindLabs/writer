import { cn } from './utils';

describe('cn', () => {
  it('joins multiple class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters falsy values', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('dedupes Tailwind conflicts (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles conditional objects and arrays', () => {
    expect(cn(['a', 'b'], { c: true, d: false }, 'e')).toBe('a b c e');
  });

  it('returns empty string for no input', () => {
    expect(cn()).toBe('');
  });
});
