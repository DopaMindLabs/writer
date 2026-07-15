import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudSectionHeader } from './CloudSectionHeader';

describe('CloudSectionHeader', () => {
  it('names the section and the four-device beta notice', () => {
    renderWithProviders(<CloudSectionHeader />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByText(/four devices per account/i)).toBeInTheDocument();
    expect(screen.getByText(/local backups/i)).toBeInTheDocument();
  });
});
