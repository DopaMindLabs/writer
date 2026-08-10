import { render, screen } from '@/test/test-utils';
import { SafeVectorPage } from './SafeVectorPage';

describe('SafeVectorPage', () => {
  it('renders only application-owned vector paths behind one accessible page image', () => {
    const { container } = render(
      <SafeVectorPage
        pageNumber={4}
        rotation={0}
        document={{ version: 1, width: 100, height: 200, paths: [{ d: 'M0 0L10 10', fill: '#111' }] }}
      />,
    );
    expect(screen.getByRole('img', { name: 'Page 4 vector' })).toBeInTheDocument();
    expect(container.querySelectorAll('path')).toHaveLength(1);
    expect(container.querySelector('g')).toHaveAttribute('aria-hidden', 'true');
  });
});
