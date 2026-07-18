import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createBrowserRouter,
  createHashRouter,
  RouterProvider,
} from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BootErrorScreen } from '@/components/chrome/BootErrorScreen';
import { RootLayout } from '@/components/chrome/RootLayout';
import { TypographyMuted } from '@/components/ui/typography';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { A11yPreferenceProvider } from '@/theme/A11yPreferenceProvider';
import { SyncScheduler } from '@/lib/sync/SyncScheduler';
import { WriterSyncProvider } from '@/lib/writerSync/WriterSyncProvider';
import { createWriterSyncCoordinator } from '@/lib/writerSync/createWriterSyncCoordinator';
import { useAppBoot } from '@/hooks/useAppBoot';
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

// Lazily loaded so the pdf.js engine chunk stays out of the entry bundle — the
// library and viewer are its only entry points and share the pdf engine chunk.
const MediaLibraryScreen = lazy(() =>
  import('@/screens/space/MediaLibrary').then((m) => ({
    default: m.MediaLibraryScreen,
  })),
);

const MediaViewerScreen = lazy(() =>
  import('@/screens/space/MediaViewer').then((m) => ({
    default: m.MediaViewerScreen,
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
      {
        path: ROUTE_PATHS[RouteName.MediaView],
        element: (
          <LazyRoute>
            <MediaViewerScreen />
          </LazyRoute>
        ),
      },
      { path: ROUTE_PATHS[RouteName.Citations], element: <CitationsScreen /> },
      { path: '*', element: <NotFoundScreen /> },
    ],
  },
]);

export const App = () => {
  const { t } = useTranslation('app');
  // One coordinator for the whole app: boot starts its providers, and the tree
  // reads capabilities from the same set.
  const coordinator = useMemo(() => createWriterSyncCoordinator(), []);
  const { ready, error, resetLocalData } = useAppBoot(coordinator);

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
        <WriterSyncProvider coordinator={coordinator}>
          <TooltipProvider delayDuration={300}>
            <SyncScheduler />
            <RouterProvider router={router} />
          </TooltipProvider>
        </WriterSyncProvider>
      </A11yPreferenceProvider>
    </ThemeProvider>
  );
};
