import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { SearchableMenuList, type SearchableMenuItem } from './SearchableMenuList';

const ITEMS: SearchableMenuItem[] = [
  { id: 'a', label: 'Manuscript' },
  { id: 'b', label: 'World' },
  { id: 'c', label: 'Workshop' },
];

const renderList = (overrides: Partial<Parameters<typeof SearchableMenuList>[0]> = {}) => {
  const onSelect = vi.fn();
  renderWithProviders(
    <SearchableMenuList
      items={ITEMS}
      onSelect={onSelect}
      label="Search sections"
      placeholder="Search sections…"
      emptyLabel="No sections found"
      data-testid="picker"
      {...overrides}
    />,
  );
  return { onSelect };
};

describe('SearchableMenuList', () => {
  it('renders every item as a listbox option', () => {
    renderList();
    expect(screen.getByRole('listbox', { name: 'Search sections' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('filters options by the typed query, case-insensitively', async () => {
    renderList();
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Search sections' }),
      'work',
    );
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Workshop');
  });

  it('marks the selected item with aria-selected', () => {
    renderList({ selectedId: 'b' });
    expect(screen.getByRole('option', { name: 'World' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('calls onSelect when an option is clicked', async () => {
    const { onSelect } = renderList();
    await userEvent.click(screen.getByRole('option', { name: 'World' }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('b');
  });

  it('roams with the arrow keys and commits the active row on Enter', async () => {
    const { onSelect } = renderList();
    const input = screen.getByRole('combobox', { name: 'Search sections' });
    input.focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('c');
  });

  it('points aria-activedescendant at the highlighted option', async () => {
    renderList();
    const input = screen.getByRole('combobox', { name: 'Search sections' });
    input.focus();
    const first = input.getAttribute('aria-activedescendant');
    expect(screen.getByRole('option', { name: 'Manuscript' })).toHaveAttribute(
      'id',
      first,
    );
    await userEvent.keyboard('{ArrowDown}');
    expect(input.getAttribute('aria-activedescendant')).not.toBe(first);
  });

  it('shows the empty label when nothing matches', async () => {
    renderList();
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Search sections' }),
      'zzz',
    );
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByText('No sections found')).toBeInTheDocument();
  });
});
