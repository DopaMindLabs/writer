import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Maps a highlight colour to its `bg-hl-*` token class. Enumerated (never
 * string-interpolated) so Tailwind can see every class at build time. Shared by
 * the annotation marks and the selection strip's colour swatches.
 */
export const swatchRecipe = cva('', {
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

export type SwatchVariants = VariantProps<typeof swatchRecipe>;

/**
 * Maps a highlight colour to its `border-l-hl-*` token class, for the 3px colour
 * edge on annotation-list rows. Enumerated so Tailwind sees every class.
 */
export const borderRecipe = cva('', {
  variants: {
    color: {
      yellow: 'border-l-hl-yellow',
      pink: 'border-l-hl-pink',
      blue: 'border-l-hl-blue',
      green: 'border-l-hl-green',
      ash: 'border-l-hl-ash',
    },
  },
  defaultVariants: { color: 'yellow' },
});
