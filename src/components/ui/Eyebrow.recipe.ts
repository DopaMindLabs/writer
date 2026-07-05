import { cva, type VariantProps } from '@/components/libs/variants';

/**
 * The mono micro-label voice — uppercase, tracked, tight leading. Shared by
 * `Eyebrow` (above titled blocks) and `SectionLabel` (menu / settings group
 * headings), and by `DropdownMenuLabel`, so every uppercase-mono label is one
 * recipe rather than a hand-rolled variant per surface.
 */
export const eyebrowRecipe = cva(
  'font-mono uppercase tracking-[0.11em] leading-none',
  {
    variants: {
      size: {
        9: 'text-[9px]',
        10: 'text-[10px]',
        11: 'text-[11px]',
      },
      tone: {
        ink2: 'text-ink-2',
        ink3: 'text-ink-3',
        ink4: 'text-ink-4',
        paper: 'text-paper',
      },
    },
    defaultVariants: { size: 10, tone: 'ink3' },
  },
);

export type EyebrowVariantProps = VariantProps<typeof eyebrowRecipe>;
