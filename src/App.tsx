import { useEffect, useState } from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  TypographyLabel,
  TypographyMuted,
  TypographyP,
} from '@/components/ui/typography';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { resetAndReseed } from '@/db/seed';
import { ROUTE_PATHS, RouteName } from '@/lib/routes';
import { HomeScreen } from '@/screens/Home';
import { AboutScreen } from '@/screens/About';
import { SettingsScreen } from '@/screens/Settings';
import { SpaceSettingsScreen } from '@/screens/SpaceSettings';
import { WriteScreen } from '@/screens/Write';
import { FocusScreen } from '@/screens/Focus';
import { ReadScreen } from '@/screens/Read';
import { SplitScreen } from '@/screens/Split';
import { BrainSpaceScreen } from '@/screens/BrainSpace';
import { CitationsScreen } from '@/screens/Citations';
import { TemplatesScreen } from '@/screens/Templates';
import { NotFoundScreen } from '@/screens/NotFound';

const router = createHashRouter([
  { path: ROUTE_PATHS[RouteName.Home], element: <HomeScreen /> },
  { path: ROUTE_PATHS[RouteName.About], element: <AboutScreen /> },
  { path: ROUTE_PATHS[RouteName.Settings], element: <SettingsScreen /> },
  { path: ROUTE_PATHS[RouteName.Templates], element: <TemplatesScreen /> },
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
]);

export const App = () => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('reseed')) {
          await resetAndReseed();
          url.searchParams.delete('reseed');
          window.history.replaceState({}, '', url.pathname + url.search);
        }
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <ThemeProvider>
        <div className="flex h-full items-center justify-center p-8 text-center">
          <div>
            <TypographyLabel variant="xs">Boot error</TypographyLabel>
            <TypographyP variant="empty" className="mt-2">
              {error.message}
            </TypographyP>
            <TypographyMuted variant="xs" className="mt-2">
              Try <code>?reseed=1</code> to reset the local database.
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
          <TypographyMuted>Booting…</TypographyMuted>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={300}>
        <RouterProvider router={router} />
      </TooltipProvider>
    </ThemeProvider>
  );
};
