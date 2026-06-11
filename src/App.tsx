import { useCallback, useEffect, useState } from 'react';
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
import { BootErrorScreen } from '@/components/chrome/BootErrorScreen';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { TypographyMuted } from '@/components/ui/typography';
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

const isReseedParamEnabled = (): boolean =>
  import.meta.env.DEV || import.meta.env.VITE_E2E === '1';

const toError = (e: unknown): Error =>
  e instanceof Error ? e : new Error(String(e));

const useAppBoot = (): {
  ready: boolean;
  error: Error | null;
  resetLocalData: () => void;
} => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const url = new URL(window.location.href);
      if (isReseedParamEnabled() && url.searchParams.has('reseed')) {
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
        if (!cancelled) setError(toError(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resetLocalData = useCallback(() => {
    setReady(false);
    setError(null);
    resetAndReseed()
      .then(() => {
        setReady(true);
      })
      .catch((e: unknown) => {
        setError(toError(e));
      });
  }, []);

  return { ready, error, resetLocalData };
};

export const App = () => {
  const { t } = useTranslation('app');
  const { ready, error, resetLocalData } = useAppBoot();

  if (error) {
    return (
      <ThemeProvider>
        <BootErrorScreen error={error} onReset={resetLocalData} />
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
