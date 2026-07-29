import {
  forwardRef,
  type ButtonHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { Check, X, type LucideIcon } from '@/components/libs/icons';
import { cn } from '@/lib/utils';
import { Icon } from './icon';
import { menuItemRecipe } from './MenuItem.recipe';
import { SlotPrimitive } from './slot.primitives';

export interface MenuItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  /** The row label. Omitted in `asChild` mode, where the child owns the content. */
  label?: ReactNode;
  /** Leading glyph. Ignored when `danger` is set (danger always shows the ✕ icon). */
  icon?: LucideIcon;
  /**
   * Trailing shortcut hint (a `Kbd`, or any node). Hidden when `checked` under
   * the default trailing check; kept visible when `checkPosition="leading"`.
   */
  shortcut?: ReactNode;
  /** Destructive item: shows the ✕ icon and is placed under a divider by the caller. */
  danger?: boolean;
  disabled?: boolean;
  /** Shows a check; the row still reads as a normal item. */
  checked?: boolean;
  /**
   * Where the check sits. `trailing` (default) replaces the shortcut with a
   * trailing tick when checked — the on/off menu idiom. `leading` reserves a
   * fixed gutter so a list of rows aligns whether ticked or not, and keeps the
   * trailing shortcut visible alongside the tick (e.g. a completed guided tour
   * that still shows its ⌘? hint).
   */
  checkPosition?: 'leading' | 'trailing';
  /**
   * Render the row as the provided child (e.g. a router `Link`) instead of a
   * `<button>`. In this mode the child owns the content — the structured
   * `icon`/`label`/`shortcut` layout applies to the default button mode only.
   */
  asChild?: boolean;
}

const leadingGlyph = (icon: LucideIcon, danger: boolean): ReactNode => (
  <span
    className={cn(
      'flex w-3.5 shrink-0 items-center justify-center',
      danger
        ? 'text-ink-2'
        : 'text-ink-3 group-hover:text-ink group-data-[highlighted]:text-ink',
    )}
  >
    <Icon icon={icon} size="xs" />
  </span>
);

const trailingShortcut = (shortcut: ReactNode): ReactNode => {
  if (shortcut === undefined || shortcut === null) return null;
  return (
    <span className="shrink-0 font-mono text-[10px] tracking-wide text-ink-4">
      {shortcut}
    </span>
  );
};

const trailing = (checked: boolean, shortcut: ReactNode): ReactNode => {
  if (checked) {
    return <Icon icon={Check} size="xs" className="shrink-0 text-ink" />;
  }
  return trailingShortcut(shortcut);
};

/** A leading tick that always occupies its gutter, so rows align when unticked. */
const leadingCheck = (checked: boolean): ReactNode => (
  <span className="flex w-3.5 shrink-0 items-center justify-center">
    <Icon
      icon={Check}
      size="xs"
      className={cn('text-ink', checked ? 'opacity-100' : 'opacity-0')}
      aria-hidden
    />
  </span>
);

const leadingSlot = (
  icon: LucideIcon | undefined,
  danger: boolean | undefined,
): ReactNode => {
  const leadingIcon = danger ? X : icon;
  return leadingIcon ? leadingGlyph(leadingIcon, danger ?? false) : null;
};

type StructuredContent = Pick<
  MenuItemProps,
  'label' | 'icon' | 'danger' | 'checked' | 'shortcut' | 'checkPosition'
>;

const structuredContent = ({
  label,
  icon,
  danger,
  checked,
  shortcut,
  checkPosition = 'trailing',
}: StructuredContent): ReactNode => {
  const leads = checkPosition === 'leading';
  return (
    <>
      {leads ? leadingCheck(checked ?? false) : leadingSlot(icon, danger)}
      <span className="flex-1 truncate">{label}</span>
      {leads ? trailingShortcut(shortcut) : trailing(checked ?? false, shortcut)}
    </>
  );
};

/**
 * A native `<button disabled>` blocks focus and activation for free, but the
 * `asChild` path (a router `Link` / anchor) keeps neither. Guarding the click
 * means a disabled row cannot navigate on click — or on Enter, which dispatches
 * a click on a link — so a router `Link` sees `defaultPrevented` and stays put.
 * Focus is removed separately via `tabIndex={-1}`.
 */
const guardedClick =
  (disabled: boolean, onClick: MenuItemProps['onClick']) =>
  (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

interface InteractiveArgs {
  asChild: boolean;
  disabled: boolean;
  danger: boolean;
  type: MenuItemProps['type'];
  tabIndex: MenuItemProps['tabIndex'];
  onClick: MenuItemProps['onClick'];
}

/**
 * The row's interaction + a11y DOM props. The default button path gets native
 * `disabled` (which blocks focus and activation for free); the `asChild` path
 * (a link) can't take it, so it leans on `aria-disabled`, `tabIndex={-1}` and
 * the click guard instead.
 */
const interactiveProps = ({
  asChild,
  disabled,
  danger,
  type,
  tabIndex,
  onClick,
}: InteractiveArgs) => ({
  type: asChild ? undefined : (type ?? 'button'),
  disabled: asChild ? undefined : disabled,
  'aria-disabled': disabled || undefined,
  'data-danger': danger || undefined,
  tabIndex: disabled ? -1 : tabIndex,
  onClick: guardedClick(disabled, onClick),
});

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  (
    {
      label,
      icon,
      shortcut,
      danger = false,
      disabled = false,
      checked = false,
      checkPosition = 'trailing',
      asChild = false,
      className,
      children,
      type,
      onClick,
      tabIndex,
      ...rest
    },
    ref,
  ) => {
    const Comp = asChild ? SlotPrimitive : 'button';
    return (
      <Comp
        ref={ref}
        {...rest}
        {...interactiveProps({ asChild, disabled, danger, type, tabIndex, onClick })}
        data-checked={checked || undefined}
        className={cn(menuItemRecipe({ disabled }), className)}
      >
        {asChild
          ? children
          : structuredContent({ label, icon, danger, checked, shortcut, checkPosition })}
      </Comp>
    );
  },
);
MenuItem.displayName = 'MenuItem';
