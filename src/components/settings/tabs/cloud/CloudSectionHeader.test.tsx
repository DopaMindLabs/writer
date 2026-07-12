import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudSectionHeader } from './CloudSectionHeader';

describe('CloudSectionHeader', () => {
  it('names the section and the eight-device beta notice', () => {
    renderWithProviders(<CloudSectionHeader />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByText(/eight devices per account/i)).toBeInTheDocument();
    expect(screen.getByText(/local backups/i)).toBeInTheDocument();
  });
});
