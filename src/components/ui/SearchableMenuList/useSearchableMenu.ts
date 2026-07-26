import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import type { SearchableMenuItem } from './SearchableMenuList.types';

const includesLabel = (label: string, query: string): boolean =>
  label.toLowerCase().includes(query.trim().toLowerCase());

const clampIndex = (index: number, length: number): number =>
  length === 0 ? 0 : Math.max(0, Math.min(index, length - 1));

interface KeyArgs {
  length: number;
  active: number;
  setActive: (next: number) => void;
  commit: () => void;
}

/**
 * The input's keyboard contract. Arrow keys roam the list via
 * `aria-activedescendant` (focus never leaves the input), Enter commits the
 * active row. Escape and Tab are left to bubble so the surrounding menu still
 * closes; every other key is stopped so a parent Radix menu's typeahead cannot
 * steal what the user is typing into the search field.
 */
const makeKeyDown =
  ({ length, active, setActive, commit }: KeyArgs) =>
  (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape' || event.key === 'Tab') return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(clampIndex(active + 1, length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(clampIndex(active - 1, length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }
    event.stopPropagation();
  };

export interface SearchableMenuState {
  query: string;
  filtered: readonly SearchableMenuItem[];
  active: number;
  hasOptions: boolean;
  listId: string;
  optionId: (index: number) => string;
  setQuery: (next: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Filtering + keyboard state for {@link SearchableMenuList}. Kept separate so
 * the component stays a thin view: this owns the query, the active-row index
 * (clamped to the filtered list), and the input's key handling.
 */
export const useSearchableMenu = (
  items: readonly SearchableMenuItem[],
  onSelect: (id: string) => void,
): SearchableMenuState => {
  const [query, setQueryRaw] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const filtered = useMemo(
    () => items.filter((item) => includesLabel(item.label, query)),
    [items, query],
  );
  const active = clampIndex(activeIndex, filtered.length);
  const hasOptions = filtered.length > 0;
  return {
    query,
    filtered,
    active,
    hasOptions,
    listId,
    optionId: (index) => `${listId}-opt-${String(index)}`,
    setQuery: (next) => {
      setQueryRaw(next);
      setActiveIndex(0);
    },
    onKeyDown: makeKeyDown({
      length: filtered.length,
      active,
      setActive: setActiveIndex,
      commit: () => {
        if (hasOptions) onSelect(filtered[active].id);
      },
    }),
  };
};
