import { renderWithProviders, screen } from '@/test/test-utils';
import { EXTERNAL_LINKS } from '@/lib/routes';
import { AboutTab } from './AboutTab';

describe('AboutTab', () => {
  it('renders the version, commit and build time from the build-time defines', () => {
    renderWithProviders(<AboutTab />);
    // Test-mode defines (see vite.config.ts).
    expect(screen.getByTestId('about-version')).toHaveTextContent('0.0.0-test');
    expect(screen.getByTestId('about-commit')).toHaveTextContent('testcommit');
    expect(screen.getByTestId('about-build-time')).toHaveTextContent(
      '1970-01-01 00:00 UTC',
    );
  });

  it('renders the build info in full, without a coming-soon overlay', () => {
    const { container } = renderWithProviders(<AboutTab />);
    expect(
      container.querySelector('[data-coming-soon-overlay]'),
    ).toBeNull();
    expect(screen.getByText(/version/i)).toBeInTheDocument();
    expect(screen.getByText(/^built$/i)).toBeInTheDocument();
  });

  it('links Source and Feedback to the repository', () => {
    renderWithProviders(<AboutTab />);
    expect(screen.getByRole('link', { name: /source/i })).toHaveAttribute(
      'href',
      EXTERNAL_LINKS.githubSource,
    );
    expect(screen.getByRole('link', { name: /send feedback/i })).toHaveAttribute(
      'href',
      EXTERNAL_LINKS.githubNewIssue,
    );
  });
});
