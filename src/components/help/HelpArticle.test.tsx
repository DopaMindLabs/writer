import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { HelpArticle } from './HelpArticle';

describe('HelpArticle', () => {
  it('renders the title, body, and related links', () => {
    renderWithProviders(<HelpArticle slug="getting-started" />);
    expect(
      screen.getByRole('heading', { name: 'Getting started', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('help-article')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'Writing & editing' });
    expect(links.length).toBeGreaterThan(0);
    expect(
      links.every((l) => l.getAttribute('href') === '/help/writing-and-editing'),
    ).toBe(true);
  });

  it('renders a not-found state for an unknown slug', () => {
    renderWithProviders(<HelpArticle slug="nope" />);
    expect(screen.getByTestId('help-article-missing')).toBeInTheDocument();
  });

  it('scrolls a heading into view when the URL carries its anchor', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderWithProviders(<HelpArticle slug="keyboard-shortcuts" />, {
      initialEntries: ['/help/keyboard-shortcuts#global'],
    });
    expect(document.getElementById('global')).not.toBeNull();
    expect(scrollIntoView).toHaveBeenCalled();
  });
});

afterEach(() => {
  // Drop the jsdom scrollIntoView shim installed by the anchor test.
  delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
});
