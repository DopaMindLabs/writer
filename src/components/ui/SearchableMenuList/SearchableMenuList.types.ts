export interface SearchableMenuItem {
  id: string;
  label: string;
}

export interface SearchableMenuListProps {
  items: readonly SearchableMenuItem[];
  /** The current value, shown with a persistent tick. */
  selectedId?: string | null;
  onSelect: (id: string) => void;
  /** Accessible name for the search input and listbox. */
  label: string;
  placeholder?: string;
  /** Shown when the filter matches nothing. */
  emptyLabel: string;
  autoFocus?: boolean;
  'data-testid'?: string;
}
