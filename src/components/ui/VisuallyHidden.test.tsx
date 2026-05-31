import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { VisuallyHidden } from './VisuallyHidden';

afterEach(cleanup);

describe('VisuallyHidden', () => {
  it('renders its children with the sr-only treatment', () => {
    render(<VisuallyHidden>loading</VisuallyHidden>);
    const el = screen.getByText('loading');
    expect(el.tagName).toBe('SPAN');
    expect(el).toHaveClass('sr-only');
  });

  it('applies the treatment to a child element via asChild', () => {
    render(
      <VisuallyHidden asChild>
        <h2>Section title</h2>
      </VisuallyHidden>,
    );
    expect(
      screen.getByRole('heading', { name: 'Section title' }),
    ).toHaveClass('sr-only');
  });

  it('matches the snapshot', () => {
    const { container } = render(<VisuallyHidden>screen-reader text</VisuallyHidden>);
    expect(container).toMatchSnapshot();
  });
});
