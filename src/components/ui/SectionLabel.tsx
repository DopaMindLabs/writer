import { forwardRef } from 'react';
import { Eyebrow, type EyebrowProps } from './Eyebrow';

export interface SectionLabelProps
  extends Omit<EyebrowProps, 'size' | 'tone'> {
  /** 9 for the tightest group eyebrow, 10 for a standard section label. */
  size?: 9 | 10;
  tone?: 'ink3' | 'ink4';
}

/**
 * The one mono heading for a group of rows — the "Appearance" /
 * "Writing" labels in Quick Settings, the group eyebrows in menus and the
 * settings nav. A named specialisation of `Eyebrow` (same recipe), so every
 * section label reads identically instead of being hand-rolled per surface.
 */
export const SectionLabel = forwardRef<HTMLDivElement, SectionLabelProps>(
  ({ size = 10, tone = 'ink3', ...props }, ref) => (
    <Eyebrow ref={ref} size={size} tone={tone} {...props} />
  ),
);
SectionLabel.displayName = 'SectionLabel';
