import { renderWithProviders as render } from '@/test/test-utils';
import { Link } from './Link';

describe('Link', () => {
  it('renders internal and external variants', () => {
    const { container } = render(
      <div>
        <Link to="/">internal default ghost</Link>
        <Link to="/space" kind="primary" size="md">
          internal primary
        </Link>
        <Link href="https://example.com" kind="secondary">
          external secondary
        </Link>
        <Link href="mailto:hi@example.com" kind="ghost">
          mailto ghost
        </Link>
      </div>,
    );
    expect(container).toMatchSnapshot();
  });
});
