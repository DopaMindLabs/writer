import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { InvariantError } from '@/lib/invariant';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs/emptyBody';
import { LexicalEditor } from './LexicalEditor';

describe('LexicalEditor initial state', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a serialized Lexical body without error', () => {
    expect(() =>
      renderWithProviders(
        <LexicalEditor
          initialValue={EMPTY_LEXICAL_JSON}
          onChange={() => {}}
          mode="write"
        />,
      ),
    ).not.toThrow();
  });

  it('rejects a body that is not serialized Lexical JSON', () => {
    // React logs the render error; silence it so the run stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      renderWithProviders(
        <LexicalEditor
          initialValue="just plain text"
          onChange={() => {}}
          mode="write"
        />,
      ),
    ).toThrow(InvariantError);
  });
});
