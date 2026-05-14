import { renderWithProviders } from '@/test/test-utils';
import { Topbar } from './Topbar';

describe('Topbar', () => {
  it('renders with doc name, mode tabs and theme toggle', () => {
    const { container } = renderWithProviders(
      <Topbar
        spaceId="s1"
        docId="d1"
        docName="Sample"
        spaceName="Test"
        mode="write"
      />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    expect(container).toMatchSnapshot();
  });

  it('renders citations view (no mode tabs, no focus toggle)', () => {
    const { container } = renderWithProviders(
      <Topbar
        spaceId="s1"
        docId={null}
        spaceName="Test"
        mode="write"
      />,
      { initialEntries: ['/s/s1/citations'] },
    );
    expect(container).toMatchSnapshot();
  });
});
