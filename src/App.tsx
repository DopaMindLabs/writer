import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
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
import { hydrateCloudDevice } from '@/lib/cloud/cloudClient';
import { startCloudReconciler } from '@/lib/cloud/reconcile';
import { startEscrowReconciler } from '@/lib/cloud/escrowReconcile';
import { keyMismatchState } from '@/lib/cloud/crypto/keyMismatch';
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
import { RouteErrorScreen } from '@/components/errors/RouteErrorScreen';

// Lazily loaded so the pdf.js engine chunk (wired into this screen in Stage PC)
// stays out of the entry bundle — this route is its only entry point.
const MediaLibraryScreen = lazy(() =>
  import('@/screens/space/MediaLibrary').then((m) => ({
    default: m.MediaLibraryScreen,
  })),
);

const RouteSuspenseFallback = () => {
  const { t } = useTranslation('app');
  return (
    <div className="flex h-full items-center justify-center font-sans text-ink-3">
      <TypographyMuted>{t('booting')}</TypographyMuted>
    </div>
  );
};

const LazyRoute = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<RouteSuspenseFallback />}>{children}</Suspense>
);

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
    errorElement: <RouteErrorScreen />,
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
      {
        path: ROUTE_PATHS[RouteName.MediaLibrary],
        element: (
          <LazyRoute>
            <MediaLibraryScreen />
          </LazyRoute>
        ),
      },
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
    let stopReconciler: (() => void) | null = null;
    let stopEscrowReconciler: (() => void) | null = null;
    const run = async () => {
      // Load the persisted device key before anything reads or writes the cloud
      // database, so encrypted reads decrypt and writes seal from the first tick.
      await hydrateCloudDevice();
      // Reconcile documents pulled from other devices into the live editor/CRDT.
      // A no-op on a plain local database.
      stopReconciler = startCloudReconciler();
      // Reconcile the device's escrow against the account's after sign-in:
      // publish it if the account has none, or flag a key mismatch to resolve.
      stopEscrowReconciler = startEscrowReconciler();
      const url = new URL(window.location.href);
      if (isReseedParamEnabled() && url.searchParams.has('reseed')) {
        await resetAndReseed();
        url.searchParams.delete('reseed');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
      // E2E/dev affordance: force the key-mismatch signal so the conflict UI can
      // be driven headlessly (the real trigger needs a live two-device sign-in).
      // Applied after any reseed so the reseed's own writes are not blocked.
      if (isReseedParamEnabled() && url.searchParams.has('cloud-mismatch')) {
        keyMismatchState.set(true);
        url.searchParams.delete('cloud-mismatch');
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
      stopReconciler?.();
      stopEscrowReconciler?.();
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
