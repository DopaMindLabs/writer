import { SearchableMenuOption } from './SearchableMenuOption';
import type { SearchableMenuItem } from './SearchableMenuList.types';

interface SearchableMenuOptionsProps {
  /** Already filtered to the current query. */
  items: readonly SearchableMenuItem[];
  listId: string;
  label: string;
  emptyLabel: string;
  selectedId?: string | null;
  activeIndex: number;
  optionId: (index: number) => string;
  onSelect: (id: string) => void;
}

/** The listbox body of a {@link SearchableMenuList}, or its empty message. */
export const SearchableMenuOptions = ({
  items,
  listId,
  label,
  emptyLabel,
  selectedId,
  activeIndex,
  optionId,
  onSelect,
}: SearchableMenuOptionsProps) => {
  if (items.length === 0) {
    return (
      <p role="status" className="px-3.5 py-2 text-[13px] text-ink-4">
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul
      role="listbox"
      id={listId}
      aria-label={label}
      className="max-h-64 overflow-y-auto"
    >
      {items.map((item, index) => (
        <SearchableMenuOption
          key={item.id}
          id={item.id}
          label={item.label}
          optionId={optionId(index)}
          selected={item.id === selectedId}
          active={index === activeIndex}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
};
