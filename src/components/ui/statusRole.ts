import {
  AlertTriangle,
  Check,
  Info,
  X,
  type LucideIcon,
} from '@/components/libs/icons';

/** The four §5 status roles. `error` maps to the repo's `danger` token. */
export type StatusKind = 'error' | 'warning' | 'success' | 'info';

/**
 * Role → lucide icon (rendered via the `Icon` wrapper). Colours are NOT kept
 * here: Tailwind only emits classes it can see as literals, so each feedback
 * component carries the `text-*`/`bg-*-bg` classes in its own `cva` recipe.
 */
export const STATUS_ICON: Record<StatusKind, LucideIcon> = {
  error: X,
  warning: AlertTriangle,
  success: Check,
  info: Info,
};
