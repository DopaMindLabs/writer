import { describe, it, expect } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('renders level-2 headings with slugified ids for anchoring', () => {
    render(<Markdown>{'## Hello World\n\nA paragraph.'}</Markdown>);
    const heading = screen.getByRole('heading', { level: 2, name: 'Hello World' });
    expect(heading.id).toBe('hello-world');
  });

  it('renders lists and paragraphs', () => {
    const { container } = render(
      <Markdown>{'Intro.\n\n- one\n- two\n'}</Markdown>,
    );
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(screen.getByText('Intro.')).toBeInTheDocument();
  });

  it('does not render raw HTML embedded in the source', () => {
    const { container } = render(
      <Markdown>{'<script>alert(1)</script> and <b>bold</b> text'}</Markdown>,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toContain('bold');
  });
});
