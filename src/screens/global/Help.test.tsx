import { describe, it, expect } from 'vitest';
import { renderAtRoute, screen } from '@/test/test-utils';
import { HelpScreen } from './Help';

describe('HelpScreen', () => {
  it('renders the landing page at /help', () => {
    renderAtRoute(<HelpScreen />, {
      path: '/help',
      initialEntries: ['/help'],
    });
    expect(screen.getByTestId('help-landing')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Help' })).toBeInTheDocument();
  });

  it('signposts the all-features catalogue from the landing', () => {
    renderAtRoute(<HelpScreen />, {
      path: '/help',
      initialEntries: ['/help'],
    });
    expect(screen.getByTestId('help-all-features')).toHaveAttribute(
      'href',
      '/help/features',
    );
  });

  it('renders the all-features catalogue article at /help/features', () => {
    renderAtRoute(<HelpScreen />, {
      path: '/help/:slug',
      initialEntries: ['/help/features'],
    });
    expect(screen.getByTestId('help-article')).toBeInTheDocument();
  });

  it('renders an article at /help/:slug', () => {
    renderAtRoute(<HelpScreen />, {
      path: '/help/:slug',
      initialEntries: ['/help/getting-started'],
    });
    expect(screen.getByTestId('help-article')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Getting started', level: 1 }),
    ).toBeInTheDocument();
  });

  it('shows a friendly message for an unknown article', () => {
    renderAtRoute(<HelpScreen />, {
      path: '/help/:slug',
      initialEntries: ['/help/not-a-real-article'],
    });
    expect(screen.getByTestId('help-article-missing')).toBeInTheDocument();
  });
});
