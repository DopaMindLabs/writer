import { useEffect, useState } from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { seedIfEmpty, resetAndReseed } from '@/db/seed';
import { HomeScreen } from '@/screens/Home';
import { AboutScreen } from '@/screens/About';
import { WriteScreen } from '@/screens/Write';
import { FocusScreen } from '@/screens/Focus';
import { ReadScreen } from '@/screens/Read';
import { SplitScreen } from '@/screens/Split';
import { DumpScreen } from '@/screens/Dump';
import { CitationsScreen } from '@/screens/Citations';
import { TemplatesScreen } from '@/screens/Templates';
import { NotFoundScreen } from '@/screens/NotFound';

const router = createHashRouter([
  { path: '/', element: <HomeScreen /> },
  { path: '/about', element: <AboutScreen /> },
  { path: '/new', element: <TemplatesScreen /> },
  { path: '/w/:worldId', element: <WriteScreen /> },
  { path: '/w/:worldId/d/:docId', element: <WriteScreen /> },
  { path: '/w/:worldId/d/:docId/focus', element: <FocusScreen /> },
  { path: '/w/:worldId/d/:docId/read', element: <ReadScreen /> },
  { path: '/w/:worldId/d/:docId/split', element: <SplitScreen /> },
  { path: '/w/:worldId/dump', element: <DumpScreen /> },
  { path: '/w/:worldId/citations', element: <CitationsScreen /> },
  { path: '*', element: <NotFoundScreen /> },
]);

export function App() {
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
        } else {
          await seedIfEmpty();
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
            <p className="font-mono text-xs uppercase tracking-wider text-ink-3">
              Boot error
            </p>
            <p className="mt-2 font-serif text-2xl text-ink">{error.message}</p>
            <p className="mt-2 text-xs text-ink-3">
              Try <code>?reseed=1</code> to reset the local database.
            </p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!ready) {
    return (
      <ThemeProvider>
        <div className="flex h-full items-center justify-center font-sans text-ink-3">
          <p className="text-sm">Booting…</p>
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
}
