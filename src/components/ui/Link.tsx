import { forwardRef, type AnchorHTMLAttributes } from 'react';
import {
  Link as RouterLink,
  type LinkProps as RouterLinkProps,
} from 'react-router-dom';
import { cn } from '@/lib/utils';
import { buttonRecipe, type ButtonKind, type ButtonSize } from './Button';

interface CommonProps {
  kind?: ButtonKind;
  size?: ButtonSize;
  className?: string;
}

type InternalLinkProps = CommonProps &
  Omit<RouterLinkProps, 'className'> & { to: RouterLinkProps['to']; href?: never };

type ExternalLinkProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'href'> & {
    href: string;
    to?: never;
    external?: boolean;
  };

export type LinkProps = InternalLinkProps | ExternalLinkProps;

export const Link = forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => {
  const { kind = 'ghost', size = 'md', className, ...rest } = props;
  const classes = cn(buttonRecipe({ kind, size }), className);

  if ('to' in rest && rest.to !== undefined) {
    const { to, ...routerRest } = rest as InternalLinkProps;
    return <RouterLink ref={ref} to={to} className={classes} {...routerRest} />;
  }

  const { external, href, target, rel, ...anchorRest } = rest as ExternalLinkProps;
  const isExternal = external ?? /^https?:\/\//.test(href);
  return (
    <a
      ref={ref}
      href={href}
      target={target ?? (isExternal ? '_blank' : undefined)}
      rel={rel ?? (isExternal ? 'noopener noreferrer' : undefined)}
      className={classes}
      {...anchorRest}
    />
  );
});
Link.displayName = 'Link';
