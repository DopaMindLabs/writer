import { Outlet } from 'react-router-dom';
import { SkipLink } from '@/components/ui/SkipLink';
import { HelpPalette } from '@/components/help/HelpPalette';
import { PwaUpdateBanner } from '@/components/chrome/PwaUpdateBanner';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';

/**
 * The router's root element: installs the global keyboard shortcuts and frames
 * every route with the skip link and help palette. Pure chrome — it owns no boot
 * or cloud state, so it can be rendered inside any router in tests and stories.
 */
export const RootLayout = () => {
  useGlobalShortcuts();
  return (
    <>
      <SkipLink />
      <PwaUpdateBanner />
      <Outlet />
      <HelpPalette />
    </>
  );
};
