import {
  forwardRef,
  type ButtonHTMLAttributes,
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
  /** Trailing shortcut hint (a `Kbd`, or any node). Hidden when `checked`. */
  shortcut?: ReactNode;
  /** Destructive item: shows the ✕ icon and is placed under a divider by the caller. */
  danger?: boolean;
  disabled?: boolean;
  /** Shows a trailing check; the row still reads as a normal item. */
  checked?: boolean;
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

const trailing = (checked: boolean, shortcut: ReactNode): ReactNode => {
  if (checked) {
    return <Icon icon={Check} size="xs" className="shrink-0 text-ink" />;
  }
  if (shortcut === undefined || shortcut === null) return null;
  return (
    <span className="shrink-0 font-mono text-[10px] tracking-wide text-ink-4">
      {shortcut}
    </span>
  );
};

type StructuredContent = Pick<
  MenuItemProps,
  'label' | 'icon' | 'danger' | 'checked' | 'shortcut'
>;

const structuredContent = ({
  label,
  icon,
  danger,
  checked,
  shortcut,
}: StructuredContent): ReactNode => {
  const leadingIcon = danger ? X : icon;
  return (
    <>
      {leadingIcon && leadingGlyph(leadingIcon, danger ?? false)}
      <span className="flex-1 truncate">{label}</span>
      {trailing(checked ?? false, shortcut)}
    </>
  );
};

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  (
    {
      label,
      icon,
      shortcut,
      danger = false,
      disabled = false,
      checked = false,
      asChild = false,
      className,
      children,
      type,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? SlotPrimitive : 'button';
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? 'button')}
        disabled={asChild ? undefined : disabled}
        aria-disabled={disabled || undefined}
        data-danger={danger || undefined}
        className={cn(menuItemRecipe({ disabled }), className)}
        {...props}
      >
        {asChild
          ? children
          : structuredContent({ label, icon, danger, checked, shortcut })}
      </Comp>
    );
  },
);
MenuItem.displayName = 'MenuItem';
