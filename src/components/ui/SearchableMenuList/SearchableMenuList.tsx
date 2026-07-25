import { SearchField } from '@/components/ui/SearchField';
import { SearchableMenuOptions } from './SearchableMenuOptions';
import { useSearchableMenu } from './useSearchableMenu';
import type { SearchableMenuListProps } from './SearchableMenuList.types';

export type {
  SearchableMenuItem,
  SearchableMenuListProps,
} from './SearchableMenuList.types';

/**
 * A search input over a filterable list of single-select rows — the "searchable
 * list inside a menu" pattern. Self-manages filtering and keyboard (see
 * {@link useSearchableMenu}) so it is decoupled from any host: drop it inside a
 * `DropdownMenuSubContent`, a `Popover`, or use it standalone. Renders as a
 * combobox over a listbox.
 */
export const SearchableMenuList = ({
  items,
  selectedId,
  onSelect,
  label,
  placeholder,
  emptyLabel,
  autoFocus = true,
  'data-testid': testId,
}: SearchableMenuListProps) => {
  const menu = useSearchableMenu(items, onSelect);
  return (
    <div data-testid={testId}>
      <SearchField
        role="combobox"
        aria-expanded={menu.hasOptions}
        aria-controls={menu.hasOptions ? menu.listId : undefined}
        aria-activedescendant={
          menu.hasOptions ? menu.optionId(menu.active) : undefined
        }
        aria-label={label}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={menu.query}
        onChange={(e) => { menu.setQuery(e.target.value); }}
        onClear={() => { menu.setQuery(''); }}
        onKeyDown={menu.onKeyDown}
        data-testid={testId ? `${testId}-search` : undefined}
        className="mb-1 px-1"
      />
      <SearchableMenuOptions
        items={menu.filtered}
        listId={menu.listId}
        label={label}
        emptyLabel={emptyLabel}
        selectedId={selectedId}
        activeIndex={menu.active}
        optionId={menu.optionId}
        onSelect={onSelect}
      />
    </div>
  );
};
