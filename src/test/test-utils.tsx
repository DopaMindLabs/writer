import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/theme/ThemeProvider';

interface ProvidersProps {
  children: ReactNode;
  initialEntries?: string[];
}

export function AllProviders({
  children,
  initialEntries = ['/'],
}: ProvidersProps) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <ThemeProvider>
        <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

type Options = RenderOptions & { initialEntries?: string[] };

export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { initialEntries, ...rest } = options;
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders initialEntries={initialEntries}>{children}</AllProviders>
    ),
    ...rest,
  });
}

type RouteOptions = RenderOptions & {
  path: string;
  initialEntries: string[];
};

export function renderAtRoute(element: ReactElement, options: RouteOptions) {
  const { path, initialEntries, ...rest } = options;
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ThemeProvider>
        <TooltipProvider delayDuration={0}>
          <Routes>
            <Route path={path} element={element} />
            <Route path="*" element={<div data-testid="catch-all" />} />
          </Routes>
        </TooltipProvider>
      </ThemeProvider>
    </MemoryRouter>,
    rest,
  );
}

export * from '@testing-library/react';
