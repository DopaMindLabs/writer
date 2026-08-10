import { Pencil, BookOpen, Brain, Quote, MoreHorizontal } from '@/components/libs/icons';
import { useUI } from '@/store/ui';
import { routes } from '@/lib/routes';

export interface MobileTabsProps {
  spaceId: string | null;
  docId?: string | null;
}

export type TabKey = 'write' | 'read' | 'brain' | 'cite' | 'more';

export interface TabItem {
  key: TabKey;
  Icon: typeof Pencil;
  href?: string;
  onClick?: () => void;
  match?: (pathname: string) => boolean;
}

export const useTabItems = ({ spaceId, docId }: MobileTabsProps): TabItem[] => {
  const setMobileMoreOpen = useUI((s) => s.setMobileMoreOpen);
  const openCitationsDrawer = useUI((s) => s.openCitationsDrawer);

  const writeHref =
    spaceId && docId
      ? routes.docWrite(spaceId, docId)
      : spaceId
        ? routes.spaceWrite(spaceId)
        : routes.home();
  const readHref = spaceId && docId ? routes.docRead(spaceId, docId) : null;
  const brainHref = spaceId ? routes.brainSpace(spaceId) : null;

  return [
    {
      key: 'write',
      Icon: Pencil,
      href: writeHref,
      match: (p) =>
        !p.endsWith('/read') &&
        !p.endsWith('/split') &&
        !p.endsWith('/brain-space') &&
        !p.endsWith('/citations') &&
        !p.includes('/notebooks/'),
    },
    {
      key: 'read',
      Icon: BookOpen,
      href: readHref ?? undefined,
      match: (p) => p.endsWith('/read'),
    },
    {
      key: 'brain',
      Icon: Brain,
      href: brainHref ?? undefined,
      match: (p) => p.endsWith('/brain-space'),
    },
    // Split view is desktop-only for now: the divider isn't reliably
    // touch-draggable on phones, so the tab is withheld until the mobile
    // split UX lands in its own PR. The /split route itself still stacks.
    {
      key: 'cite',
      Icon: Quote,
      onClick: () => { openCitationsDrawer(); },
      match: (p) => p.endsWith('/citations'),
    },
    {
      key: 'more',
      Icon: MoreHorizontal,
      onClick: () => { setMobileMoreOpen(true); },
    },
  ];
};
