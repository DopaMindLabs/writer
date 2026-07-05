import { cva, type VariantProps } from '@/components/libs/variants';

/**
 * A menu row is a list item, not a card: no background at rest, a faint
 * paper-2 wash on hover / keyboard highlight, square corners, mono shortcuts
 * on the right. The `group` marker lets the leading glyph darken with the row.
 */
export const menuItemRecipe = cva(
  'group relative flex w-full cursor-pointer select-none items-center gap-2.5 px-3.5 py-1.5 text-left font-sans text-[13px] font-normal text-ink-2 outline-none transition-colors hover:bg-paper-2 hover:text-ink focus-visible:bg-paper-2 focus-visible:text-ink data-[highlighted]:bg-paper-2 data-[highlighted]:text-ink',
  {
    variants: {
      disabled: {
        true: 'pointer-events-none cursor-not-allowed text-ink-4 data-[highlighted]:bg-transparent data-[highlighted]:text-ink-4',
        false: '',
      },
    },
    defaultVariants: { disabled: false },
  },
);

export type MenuItemVariantProps = VariantProps<typeof menuItemRecipe>;
