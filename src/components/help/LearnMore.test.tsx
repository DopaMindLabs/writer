import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { LearnMore } from './LearnMore';

describe('LearnMore', () => {
  it('deep-links to an article anchor', () => {
    renderWithProviders(<LearnMore slug="brainspace" anchor="notes" />);
    expect(screen.getByTestId('learn-more')).toHaveAttribute(
      'href',
      '/help/brainspace#notes',
    );
  });

  it('links to the article root when no anchor is given', () => {
    renderWithProviders(<LearnMore slug="your-data" />);
    expect(screen.getByTestId('learn-more')).toHaveAttribute(
      'href',
      '/help/your-data',
    );
  });

  it('supports a custom label', () => {
    renderWithProviders(<LearnMore slug="mobile" label="Read more" />);
    expect(screen.getByTestId('learn-more')).toHaveTextContent('Read more');
  });
});
