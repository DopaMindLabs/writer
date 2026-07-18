import { renderWithProviders, screen } from '@/test/test-utils';
import { routes } from '@/lib/routes';
import { TemplatesHeader } from './TemplatesHeader';

describe('TemplatesHeader', () => {
  it('links back home and labels the screen', () => {
    renderWithProviders(<TemplatesHeader />);
    const back = screen.getByTestId('templates-back');
    expect(back).toHaveAttribute('href', routes.home());
    expect(back).toHaveTextContent(/back/i);
    expect(screen.getByText(/new space/i)).toBeInTheDocument();
  });
});
