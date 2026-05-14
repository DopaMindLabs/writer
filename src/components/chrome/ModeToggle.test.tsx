import { renderWithProviders } from '@/test/test-utils';
import { FocusToggle, ModeTabs } from './ModeToggle';

describe('ModeTabs', () => {
  it('renders write/read/split/space tabs with active state', () => {
    const { container } = renderWithProviders(
      <ModeTabs mode="write" spaceId="s1" docId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    expect(container).toMatchSnapshot();
  });

  it('hides per-doc tabs when docId is null', () => {
    const { container } = renderWithProviders(
      <ModeTabs mode="dump" spaceId="s1" docId={null} />,
      { initialEntries: ['/s/s1/dump'] },
    );
    expect(container).toMatchSnapshot();
  });
});

describe('FocusToggle', () => {
  it('renders focus enter link in write mode', () => {
    const { container } = renderWithProviders(
      <FocusToggle mode="write" spaceId="s1" docId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    expect(container).toMatchSnapshot();
  });

  it('returns null in read mode', () => {
    const { container } = renderWithProviders(
      <FocusToggle mode="read" spaceId="s1" docId="d1" />,
      { initialEntries: ['/s/s1/d/d1/read'] },
    );
    expect(container).toMatchSnapshot();
  });
});
