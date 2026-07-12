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

  it('honours explicit {#slug} ids on headings and strips them from text', () => {
    render(<Markdown>{'## アクセシビリティ {#overview}\n\nBody.'}</Markdown>);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.id).toBe('overview');
    expect(heading.textContent).toBe('アクセシビリティ');
  });

  it('applies explicit ids to level-3 headings too', () => {
    render(<Markdown>{'### 概要 {#summary}\n\nBody.'}</Markdown>);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.id).toBe('summary');
    expect(heading.textContent).toBe('概要');
  });

  it('renders external http links with rel and target attributes', () => {
    render(<Markdown>{'[home](https://example.com)'}</Markdown>);
    const link = screen.getByRole('link', { name: 'home' });
    expect(link.getAttribute('href')).toBe('https://example.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders mailto links as external', () => {
    render(<Markdown>{'[mail](mailto:x@y.z)'}</Markdown>);
    const link = screen.getByRole('link', { name: 'mail' });
    expect(link.getAttribute('href')).toBe('mailto:x@y.z');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('renders relative links as internal help routes', () => {
    render(<Markdown>{'[other](/other-article#section)'}</Markdown>);
    const link = screen.getByRole('link', { name: 'other' });
    expect(link.getAttribute('href')).toContain('other-article');
    expect(link.getAttribute('target')).toBeNull();
  });

  it('drops the anchor when the href is empty or missing', () => {
    const { container } = render(<Markdown>{'[bare]()'}</Markdown>);
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('bare');
  });

  it('renders the full block palette so every custom renderer runs', () => {
    const md = [
      '# Title',
      '',
      '> quoted line',
      '',
      '**bold** and *italic*',
      '',
      '`inline code`',
      '',
      '```\nblock code\n```',
      '',
      '1. first',
      '2. second',
      '',
      '---',
      '',
    ].join('\n');
    const { container } = render(<Markdown>{md}</Markdown>);
    expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument();
    expect(container.querySelector('blockquote')).not.toBeNull();
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toBe('italic');
    expect(container.querySelector('code')?.textContent).toContain('inline code');
    expect(container.querySelector('pre')).not.toBeNull();
    expect(container.querySelectorAll('ol > li')).toHaveLength(2);
    expect(container.querySelector('hr')).not.toBeNull();
  });

  it('renders headings containing inline formatting (react-element children path)', () => {
    render(<Markdown>{'## Intro *italic*'}</Markdown>);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('italic');
    expect(heading.id).toBe('intro-italic');
  });

  it('strips the {#slug} suffix even when nested in trailing inline elements', () => {
    render(<Markdown>{'## Prefix **strong** {#custom}'}</Markdown>);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.id).toBe('custom');
    expect(heading.textContent).not.toContain('{');
  });
});
