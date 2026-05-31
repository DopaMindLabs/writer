import { renderWithProviders } from '@/test/test-utils';
import { NotFoundScreen } from './NotFound';

describe('NotFoundScreen', () => {
  it('renders 404 content and home link', () => {
    const { getByText } = renderWithProviders(<NotFoundScreen />);
    expect(getByText('404')).toBeInTheDocument();
    expect(getByText('Lost in the margins')).toBeInTheDocument();
    expect(getByText('Go home')).toBeInTheDocument();
  });
});
