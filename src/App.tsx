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
import { hydrateCloudDevice } from '@/lib/cloud/cloudClient';
import { loadDeviceKeyRing } from '@/lib/cloud/crypto/keyStore';
import { startKeyRingChannel } from '@/lib/cloud/crypto/keyRingChannel';
import { startCloudReconciler } from '@/lib/cloud/reconcile';
import { startEscrowReconciler } from '@/lib/cloud/escrowReconcile';
import { startKeylessLockMonitor } from '@/lib/cloud/keylessGuard';
import { startDeviceRegistrar } from '@/lib/cloud/deviceRegistrar';
import { keyMismatchState } from '@/lib/cloud/crypto/keyMismatch';
import { keylessLockState } from '@/lib/cloud/crypto/keylessLock';
import { deviceLimitState } from '@/lib/cloud/deviceLimit';
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
      { path: ROUTE_PATHS[RouteName.Citations], element: <CitationsScreen /> },
      { path: '*', element: <NotFoundScreen /> },
    ],
  },
]);

const isReseedParamEnabled = (): boolean =>
  import.meta.env.DEV || import.meta.env.VITE_E2E === '1';

const stripParam = (url: URL, name: string): void => {
  url.searchParams.delete(name);
  window.history.replaceState({}, '', url.pathname + url.search);
};

/**
 * Dev/E2E-only URL affordances, applied after boot wiring: `?reseed` reseeds the
 * local database, `?cloud-mismatch` forces the key-mismatch signal,
 * `?cloud-keyless` forces the signed-in-keyless lock and `?cloud-devices` forces
 * the device-limit block, so each of these surfaces can be driven headlessly
 * (the real triggers need a live sign-in). Applied after any reseed so the
 * reseed's own writes are never blocked by a forced lock.
 */
const applyDevBootParams = async (): Promise<void> => {
  if (!isReseedParamEnabled()) return;
  const url = new URL(window.location.href);
  if (url.searchParams.has('reseed')) {
    await resetAndReseed();
    stripParam(url, 'reseed');
  }
  if (url.searchParams.has('cloud-mismatch')) {
    keyMismatchState.set(true);
    stripParam(url, 'cloud-mismatch');
  }
  if (url.searchParams.has('cloud-keyless')) {
    keylessLockState.set(true);
    stripParam(url, 'cloud-keyless');
  }
  if (url.searchParams.has('cloud-devices')) {
    deviceLimitState.set(true);
    stripParam(url, 'cloud-devices');
  }
};

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
    let stopKeylessMonitor: (() => void) | null = null;
    let stopKeyRingChannel: (() => void) | null = null;
    let stopDeviceRegistrar: (() => void) | null = null;
    const run = async () => {
      // Load the persisted device key before anything reads or writes the cloud
      // database, so encrypted reads decrypt and writes seal from the first tick.
      await hydrateCloudDevice();
      // Refresh this tab's key ring when a sibling tab unlocks or forgets it, so
      // navigation names appear (or lock) everywhere without a reload.
      stopKeyRingChannel = startKeyRingChannel(() => {
        void loadDeviceKeyRing();
      });
      // Reconcile documents pulled from other devices into the live editor/CRDT.
      // A no-op on a plain local database.
      stopReconciler = startCloudReconciler();
      // Reconcile the device's escrow against the account's after sign-in:
      // publish it if the account has none, or flag a key mismatch to resolve.
      stopEscrowReconciler = startEscrowReconciler();
      // Lock content writes whenever the device is signed in without a key ring,
      // so plaintext can never reach the sync queue before setup/unlock.
      stopKeylessMonitor = startKeylessLockMonitor();
      // Keep this device's row in the account's device registry current, so the
      // two-device beta limit can count and recognise it.
      stopDeviceRegistrar = startDeviceRegistrar();
      await applyDevBootParams();
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
      stopKeylessMonitor?.();
      stopKeyRingChannel?.();
      stopDeviceRegistrar?.();
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
