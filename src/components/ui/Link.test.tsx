import { renderWithProviders as render } from '@/test/test-utils';
import { Link } from './Link';

describe('Link', () => {
  it('renders internal and external variants', () => {
    const { container } = render(
      <div>
        <Link to="/">internal default unstyled</Link>
        <Link to="/space" kind="primary" size="md">
          internal primary
        </Link>
        <Link to="/about" kind="ghost">
          internal ghost
        </Link>
        <Link href="https://example.com" kind="secondary">
          external secondary
        </Link>
        <Link href="mailto:hi@example.com">mailto unstyled</Link>
      </div>,
    );
    expect(container).toMatchSnapshot();
  });

  it('applies activeClassName when route matches', () => {
    const { getByText } = render(
      <Link
        to="/about"
        className="text-ink-3"
        activeClassName="text-ink"
      >
        about
      </Link>,
      { initialEntries: ['/about'] },
    );
    expect(getByText('about').className).toContain('text-ink');
  });

  it('omits activeClassName when route does not match', () => {
    const { getByText } = render(
      <Link
        to="/about"
        className="text-ink-3"
        activeClassName="text-ink"
      >
        about
      </Link>,
      { initialEntries: ['/'] },
    );
    expect(getByText('about').className).toContain('text-ink-3');
    expect(getByText('about').className).not.toContain(' text-ink');
  });

  it('auto-adds target/rel for external URLs', () => {
    const { getByText } = render(
      <Link href="https://example.com">external</Link>,
    );
    const el = getByText('external');
    expect(el.getAttribute('target')).toBe('_blank');
    expect(el.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
