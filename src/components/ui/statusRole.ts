import {
  AlertTriangle,
  Check,
  Info,
  X,
  type LucideIcon,
} from '@/components/libs/icons';

export type StatusKind = 'error' | 'warning' | 'success' | 'info';

export const STATUS_ICON: Record<StatusKind, LucideIcon> = {
  error: X,
  warning: AlertTriangle,
  success: Check,
  info: Info,
};
