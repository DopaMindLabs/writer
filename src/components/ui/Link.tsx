import { forwardRef, type AnchorHTMLAttributes } from 'react';
import {
  NavLink as RouterNavLink,
  Link as RouterLink,
  type LinkProps as RouterLinkProps,
  type NavLinkProps as RouterNavLinkProps,
} from 'react-router-dom';
import { cn } from '@/lib/utils';
import { buttonRecipe } from './Button.recipe';
import { type ButtonKind, type ButtonSize } from './Button';

interface CommonProps {
  kind?: ButtonKind;
  size?: ButtonSize;
  className?: string;
  activeClassName?: string;
  activeKind?: ButtonKind;
  end?: RouterNavLinkProps['end'];
}

type InternalLinkProps = CommonProps &
  Omit<RouterLinkProps, 'className'> & {
    to: RouterLinkProps['to'];
    href?: never;
  };

type ExternalLinkProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'href'> & {
    href: string;
    to?: never;
    external?: boolean;
  };

export type LinkProps = InternalLinkProps | ExternalLinkProps;

export const Link = forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => {
  const {
    kind,
    size,
    className,
    activeClassName,
    activeKind,
    end,
    ...rest
  } = props;
  const baseClasses = kind ? buttonRecipe({ kind, size }) : undefined;

  if ('to' in rest && rest.to !== undefined) {
    const { to, ...routerRest } = rest as InternalLinkProps;
    const hasActiveBehavior =
      activeClassName !== undefined || activeKind !== undefined;

    if (hasActiveBehavior) {
      return (
        <RouterNavLink
          ref={ref}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              isActive && activeKind
                ? buttonRecipe({ kind: activeKind, size })
                : baseClasses,
              className,
              isActive ? activeClassName : undefined,
            )
          }
          {...(routerRest as Omit<RouterNavLinkProps, 'to' | 'className' | 'end'>)}
        />
      );
    }

    return (
      <RouterLink
        ref={ref}
        to={to}
        className={cn(baseClasses, className)}
        {...routerRest}
      />
    );
  }

  const { external, href, target, rel, ...anchorRest } =
    rest as ExternalLinkProps;
  const isExternal = external ?? /^https?:\/\//.test(href);
  return (
    <a
      ref={ref}
      href={href}
      target={target ?? (isExternal ? '_blank' : undefined)}
      rel={rel ?? (isExternal ? 'noopener noreferrer' : undefined)}
      className={cn(baseClasses, className)}
      {...anchorRest}
    />
  );
});
Link.displayName = 'Link';
