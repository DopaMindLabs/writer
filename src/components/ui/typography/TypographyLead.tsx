import { forwardRef } from 'react';
import { TypographyP, type TypographyPProps } from './TypographyP';

export type TypographyLeadProps = Omit<TypographyPProps, 'variant'>;

export const TypographyLead = forwardRef<
  HTMLParagraphElement,
  TypographyLeadProps
>((props, ref) => <TypographyP ref={ref} variant="lead" {...props} />);
TypographyLead.displayName = 'TypographyLead';
