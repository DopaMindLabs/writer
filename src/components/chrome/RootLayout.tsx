import { Outlet } from 'react-router-dom';
import { SkipLink } from '@/components/ui/SkipLink';
import { HelpPalette } from '@/components/help/HelpPalette';
import { PeerLinkNotice } from '@/components/chrome/PeerLinkNotice';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';

/**
 * The router's root element: installs the global keyboard shortcuts and frames
 * every route with the skip link, help palette and peer-link notice. Pure chrome
 * — it owns no boot or cloud state, so it can be rendered inside any router in
 * tests and stories.
 *
 * The notice lives here because it is the only element every screen shares, and
 * a link that drops while someone is writing must be visible wherever they are.
 * It self-gates to silence, so on every screen that is not the one case it
 * renders nothing at all.
 */
export const RootLayout = () => {
  useGlobalShortcuts();
  return (
    <>
      <SkipLink />
      <Outlet />
      <PeerLinkNotice />
      <HelpPalette />
    </>
  );
};
