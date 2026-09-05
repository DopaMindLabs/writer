import { renderWithProviders } from '@/test/test-utils';
import { AboutScreen } from './About';

describe('AboutScreen', () => {
  it('renders heading and status section', () => {
    const { getByText } = renderWithProviders(<AboutScreen />);
    expect(getByText('Hi,')).toBeInTheDocument();
    expect(getByText('Status')).toBeInTheDocument();
    expect(getByText('Source')).toBeInTheDocument();
  });

  it('describes sync truthfully in the status line', () => {
    const { container } = renderWithProviders(<AboutScreen />);
    expect(container.textContent).not.toContain('there is no data sync');
    expect(container.textContent).toContain('not synced elsewhere');
  });
});
