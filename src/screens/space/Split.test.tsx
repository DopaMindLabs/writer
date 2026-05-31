import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { renderAtRoute, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { FIXED_TIME, sampleSpace } from '@/test/fixtures';
import type { Doc } from '@/db/schema';
import { useUI } from '@/store/ui';

vi.mock('@/editor/EditorFacade', () => ({
  Editor: (p: { initialValue: string; mode: string }) => (
    <div data-testid="editor-stub" data-mode={p.mode}>
      {p.initialValue || '(empty)'}
    </div>
  ),
}));

const { SplitScreen } = await import('./Split');

const docA: Doc = {
  id: 'd1',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'Left Doc',
  body: 'left body',
  meta: { wordCount: 0 },
  updatedAt: FIXED_TIME,
};
const docB: Doc = {
  ...docA,
  id: 'd2',
  name: 'Right Doc',
  body: 'right body',
};
const docC: Doc = {
  ...docA,
  id: 'd3',
  name: 'Third Doc',
  body: 'third',
};

const seed = async () => {
  await db.spaces.put(sampleSpace);
  await db.docs.bulkPut([docA, docB, docC]);
};

const renderAt = (initialPath: string) =>
  renderAtRoute(<SplitScreen />, {
    path: '/s/:spaceId/d/:docId/split',
    initialEntries: [initialPath],
  });

describe('SplitScreen', () => {
  beforeEach(seed);

  describe('rendering', () => {
    it('should render both editor panes', async () => {
      const { findAllByTestId } = renderAt('/s/s1/d/d1/split?with=d2');
      const editors = await findAllByTestId('editor-stub');
      expect(editors).toHaveLength(2);
    });

    it('should redirect when params are missing', () => {
      const { queryByTestId } = renderAtRoute(<SplitScreen />, {
        path: '/orphan',
        initialEntries: ['/orphan'],
      });
      expect(queryByTestId('catch-all')).toBeInTheDocument();
    });

    it('should render BrainSpaceCanvas on the right when with=dump', async () => {
      renderAt('/s/s1/d/d1/split?with=dump');
      expect(await screen.findByTestId('brain-canvas')).toBeInTheDocument();
    });

    it('should render CitationsPane on the right when with=citations', async () => {
      renderAt('/s/s1/d/d1/split?with=citations');
      expect(await screen.findByTestId('citations-pane')).toBeInTheDocument();
    });
  });

  describe('right-pane select', () => {
    it('should change the right pane when a different doc is picked', async () => {
      renderAt('/s/s1/d/d1/split?with=d2');
      const select = (await screen.findByTestId(
        'split-right-pane-select',
      ));
      expect(select).toHaveAttribute('aria-label', 'Right pane document');
      await userEvent.selectOptions(select, 'd3');
      await waitFor(() => { expect(select.value).toBe('d3'); });
    });

    it('should fall back to the first candidate when withParam is missing', async () => {
      renderAt('/s/s1/d/d1/split');
      const select = (await screen.findByTestId(
        'split-right-pane-select',
      ));
      await waitFor(() => { expect(select.value).toMatch(/d2|d3/); });
    });
  });

  describe('divider keyboard', () => {
    it('should update the divider percent via keyboard arrows', async () => {
      renderAt('/s/s1/d/d1/split?with=d2');
      const sep = await screen.findByTestId('split-divider');
      expect(sep).toHaveAttribute('role', 'separator');
      sep.focus();
      const startPct = useUI.getState().splitDividerPct;
      await userEvent.keyboard('{ArrowRight}');
      await waitFor(() =>
        { expect(useUI.getState().splitDividerPct).toBeGreaterThan(startPct); },
      );
      await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
      await userEvent.keyboard('{Home}');
      expect(useUI.getState().splitDividerPct).toBe(25);
      await userEvent.keyboard('{End}');
      expect(useUI.getState().splitDividerPct).toBe(75);
      await userEvent.keyboard(' ');
      expect(useUI.getState().splitDividerPct).toBe(50);
    });
  });

  describe('divider pointer', () => {
    it('should snap to 50% on divider double-click', async () => {
      useUI.getState().setSplitDividerPct(30);
      renderAt('/s/s1/d/d1/split?with=d2');
      const sep = await screen.findByTestId('split-divider');
      await userEvent.dblClick(sep);
      expect(useUI.getState().splitDividerPct).toBe(50);
    });

    it('should update the split percent on pointer drag with a non-zero container width', async () => {
      renderAt('/s/s1/d/d1/split?with=d2');
      const sep = await screen.findByTestId('split-divider');
      (sep as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture =
        () => {};
      (sep as unknown as { hasPointerCapture: (id: number) => boolean }).hasPointerCapture =
        () => true;
      (sep as unknown as { releasePointerCapture: (id: number) => void }).releasePointerCapture =
        () => {};
      const container = sep.parentElement!;
      container.getBoundingClientRect = () =>
        ({
          left: 0,
          top: 0,
          right: 1000,
          bottom: 600,
          width: 1000,
          height: 600,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        });
      fireEvent.pointerDown(sep, { pointerId: 1, clientX: 300 });
      fireEvent.pointerMove(sep, { pointerId: 1, clientX: 600 });
      fireEvent.pointerUp(sep, { pointerId: 1, clientX: 600 });
      await waitFor(() => {
        const pct = useUI.getState().splitDividerPct;
        expect(pct).toBeGreaterThan(50);
        expect(pct).toBeLessThanOrEqual(75);
      });
    });

    it('should complete a pointer drag-release cycle without error', async () => {
      renderAt('/s/s1/d/d1/split?with=d2');
      const sep = await screen.findByTestId('split-divider');
      (sep as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture =
        () => {};
      (sep as unknown as { hasPointerCapture: (id: number) => boolean }).hasPointerCapture =
        () => true;
      (sep as unknown as { releasePointerCapture: (id: number) => void }).releasePointerCapture =
        () => {};
      fireEvent.pointerDown(sep, { pointerId: 1, clientX: 400 });
      fireEvent.pointerMove(sep, { pointerId: 1, clientX: 500 });
      fireEvent.pointerUp(sep, { pointerId: 1, clientX: 500 });
      fireEvent.pointerDown(sep, { pointerId: 1, clientX: 400 });
      fireEvent.pointerCancel(sep, { pointerId: 1, clientX: 400 });
      expect(true).toBe(true);
    });
  });
});
