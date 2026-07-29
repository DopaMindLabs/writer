import { useEffect, useRef } from 'react';
import { Check } from '@/components/libs/icons';
import { cn } from '@/lib/utils';
import { menuItemRecipe } from '@/components/ui/MenuItem.recipe';

export interface SearchableMenuOptionProps {
  /** The item's stable id, passed back on selection. */
  id: string;
  label: string;
  /** DOM id so the input's `aria-activedescendant` can point at this row. */
  optionId: string;
  /** The current value — shows a persistent tick. */
  selected: boolean;
  /** Keyboard-highlighted (driven by the input, not focus). */
  active: boolean;
  onSelect: (id: string) => void;
}

/**
 * One row of a {@link SearchableMenuList}. A listbox `option`, not a focusable
 * button: keyboard focus stays in the search input and moves here via
 * `aria-activedescendant`, so the list reads as one combobox to assistive tech.
 */
export const SearchableMenuOption = ({
  id,
  label,
  optionId,
  selected,
  active,
  onSelect,
}: SearchableMenuOptionProps) => {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);
  return (
    <li
      ref={ref}
      id={optionId}
      role="option"
      aria-selected={selected}
      data-highlighted={active ? '' : undefined}
      data-testid={`searchable-menu-option-${id}`}
      // Pointer selection; preventDefault keeps focus in the input so the menu
      // does not blur-close before onSelect runs.
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect(id);
      }}
      className={cn(menuItemRecipe({ disabled: false }))}
    >
      <span className="flex-1 truncate">{label}</span>
      <Check
        className={cn(
          'h-3.5 w-3.5 shrink-0 text-ink',
          selected ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden
      />
    </li>
  );
};
