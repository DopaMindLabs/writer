import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { LimitHighlightPlugin } from './LimitHighlightPlugin';

const withComposer = (ui: ReactNode) => (
  <LexicalComposer
    initialConfig={{
      namespace: 'limit-highlight-test',
      nodes: [],
      onError: (error: Error) => {
        throw error;
      },
    }}
  >
    {ui}
  </LexicalComposer>
);

describe('LimitHighlightPlugin', () => {
  it('renders a pointer-events-none overlay layer', () => {
    const { getByTestId } = render(
      withComposer(<LimitHighlightPlugin charLimit={5} />),
    );
    const overlay = getByTestId('limit-highlight-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('pointer-events-none');
    expect(overlay).toHaveAttribute('aria-hidden');
  });

  it('does not push the overlay behind the page with a negative z-index', () => {
    const { getByTestId } = render(
      withComposer(<LimitHighlightPlugin charLimit={5} />),
    );
    const overlay = getByTestId('limit-highlight-overlay');
    expect(overlay.style.zIndex).not.toBe('-1');
    const z = Number(overlay.style.zIndex);
    if (!Number.isNaN(z)) expect(z).toBeGreaterThanOrEqual(0);
  });

  it('mounts and unmounts cleanly with both limits set', () => {
    const { unmount, getByTestId } = render(
      withComposer(<LimitHighlightPlugin wordLimit={3} charLimit={10} />),
    );
    expect(getByTestId('limit-highlight-overlay')).toBeInTheDocument();
    expect(() => {
      unmount();
    }).not.toThrow();
  });
});
