import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createBrowserRouter,
  createHashRouter,
  Outlet,
  RouterProvider,
} from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SkipLink } from '@/components/ui/SkipLink';
import { HelpPalette } from '@/components/help/HelpPalette';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import {
  TypographyLabel,
  TypographyMuted,
  TypographyP,
} from '@/components/ui/typography';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { A11yPreferenceProvider } from '@/theme/A11yPreferenceProvider';
import { SyncScheduler } from '@/lib/sync/SyncScheduler';
import { resetAndReseed } from '@/db/seed';
import { ROUTE_PATHS, RouteName } from '@/lib/routes';
import { HomeScreen } from '@/screens/global/Home';
import { AboutScreen } from '@/screens/global/About';
import { SettingsScreen } from '@/screens/global/Settings';
import { SpaceSettingsScreen } from '@/screens/space/SpaceSettings';
import { WriteScreen } from '@/screens/space/Write';
import { FocusScreen } from '@/screens/space/Focus';
import { ReadScreen } from '@/screens/space/Read';
import { SplitScreen } from '@/screens/space/Split';
import { BrainSpaceScreen } from '@/screens/space/BrainSpace';
import { CitationsScreen } from '@/screens/space/Citations';
import { TemplatesScreen } from '@/screens/global/Templates';
import { HelpScreen } from '@/screens/global/Help';
import { NotFoundScreen } from '@/screens/global/NotFound';

/**
 * Pathless layout route: mounts app-wide concerns once (global keyboard
 * shortcuts + the Quick Help overlay) with full router context, then renders
 * the matched screen via <Outlet />.
 */
const RootLayout = () => {
  useGlobalShortcuts();
  return (
    <>
      <SkipLink />
      <Outlet />
      <HelpPalette />
    </>
  );
};

// Vercel serves the app from `/` and supports SPA rewrites, so a browser
// router gives clean URLs there. GitHub Pages can't rewrite, so it keeps the
// hash router. Driven by `VITE_ROUTER`, set in `vercel.json`.
const createAppRouter =
  import.meta.env.VITE_ROUTER === 'browser'
    ? createBrowserRouter
    : createHashRouter;

const router = createAppRouter([
  {
    element: <RootLayout />,
    children: [
      { path: ROUTE_PATHS[RouteName.Home], element: <HomeScreen /> },
      { path: ROUTE_PATHS[RouteName.About], element: <AboutScreen /> },
      { path: ROUTE_PATHS[RouteName.Settings], element: <SettingsScreen /> },
      { path: ROUTE_PATHS[RouteName.Templates], element: <TemplatesScreen /> },
      { path: ROUTE_PATHS[RouteName.Help], element: <HelpScreen /> },
      { path: ROUTE_PATHS[RouteName.HelpArticle], element: <HelpScreen /> },
      { path: ROUTE_PATHS[RouteName.SpaceWrite], element: <WriteScreen /> },
      {
        path: ROUTE_PATHS[RouteName.SpaceSettings],
        element: <SpaceSettingsScreen />,
      },
      { path: ROUTE_PATHS[RouteName.DocWrite], element: <WriteScreen /> },
      { path: ROUTE_PATHS[RouteName.DocFocus], element: <FocusScreen /> },
      { path: ROUTE_PATHS[RouteName.DocRead], element: <ReadScreen /> },
      { path: ROUTE_PATHS[RouteName.DocSplit], element: <SplitScreen /> },
      { path: ROUTE_PATHS[RouteName.BrainSpace], element: <BrainSpaceScreen /> },
      { path: ROUTE_PATHS[RouteName.Citations], element: <CitationsScreen /> },
      { path: '*', element: <NotFoundScreen /> },
    ],
  },
]);

/**
 * Run the one-time boot sequence (optional `?reseed=1` reset) and expose the
 * ready/error state. Extracted from <App /> so the component stays small.
 */
const useAppBoot = (): { ready: boolean; error: Error | null } => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const url = new URL(window.location.href);
      if (url.searchParams.has('reseed')) {
        await resetAndReseed();
        url.searchParams.delete('reseed');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    };
    run()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, error };
};

export const App = () => {
  const { t } = useTranslation('app');
  const { ready, error } = useAppBoot();

  if (error) {
    return (
      <ThemeProvider>
        <div className="flex h-full items-center justify-center p-8 text-center">
          <div>
            <TypographyLabel variant="xs">{t('bootErrorLabel')}</TypographyLabel>
            <TypographyP variant="empty" className="mt-2">
              {error.message}
            </TypographyP>
            <TypographyMuted variant="xs" className="mt-2">
              {t('bootErrorHintBefore')}
              <code>{t('bootErrorHintCode')}</code>
              {t('bootErrorHintAfter')}
            </TypographyMuted>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!ready) {
    return (
      <ThemeProvider>
        <div className="flex h-full items-center justify-center font-sans text-ink-3">
          <TypographyMuted>{t('booting')}</TypographyMuted>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <A11yPreferenceProvider>
        <TooltipProvider delayDuration={300}>
          <SyncScheduler />
          <RouterProvider router={router} />
        </TooltipProvider>
      </A11yPreferenceProvider>
    </ThemeProvider>
  );
};
