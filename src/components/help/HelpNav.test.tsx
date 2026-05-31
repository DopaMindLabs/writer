import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { HelpNav } from './HelpNav';

describe('HelpNav', () => {
  it('renders category labels and article links', () => {
    renderWithProviders(<HelpNav />);
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Getting started' });
    expect(link).toHaveAttribute('href', '/help/getting-started');
  });

  it('links to the keyboard shortcuts article', () => {
    renderWithProviders(<HelpNav />);
    expect(
      screen.getByRole('link', { name: 'Keyboard shortcuts' }),
    ).toHaveAttribute('href', '/help/keyboard-shortcuts');
  });
});
