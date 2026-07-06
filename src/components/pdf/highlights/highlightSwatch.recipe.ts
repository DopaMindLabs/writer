import { cva, type VariantProps } from '@/components/libs/variants';

/**
 * Maps a {@link HighlightColor} to its `bg-hl-*` token class. Enumerated (never
 * string-interpolated) so Tailwind can see every class at build time. Shared by
 * the highlight marks and the colour swatches in the toolbar / menus.
 */
export const highlightSwatchRecipe = cva('', {
  variants: {
    color: {
      yellow: 'bg-hl-yellow',
      pink: 'bg-hl-pink',
      blue: 'bg-hl-blue',
      green: 'bg-hl-green',
      ash: 'bg-hl-ash',
    },
  },
  defaultVariants: { color: 'yellow' },
});

export type HighlightSwatchVariants = VariantProps<typeof highlightSwatchRecipe>;
