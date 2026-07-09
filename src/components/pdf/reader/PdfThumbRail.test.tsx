import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import type { PdfAnnotation } from '@/db/schema';

const { requestPage, thumbsRef } = vi.hoisted(() => ({
  requestPage: vi.fn(),
  thumbsRef: { current: {} as Record<number, string> },
}));
vi.mock('@/hooks/usePdfThumbnails', () => ({
  usePdfThumbnails: () => ({ thumbs: thumbsRef.current, requestPage }),
}));

import { PdfThumbRail } from './PdfThumbRail';

// Capture the observer's callback and observed elements so a test can report a
// thumbnail as visible and prove the rail asks for its page.
let ioCallback: IntersectionObserverCallback | null = null;
const observed: Element[] = [];
class MockIntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: readonly number[] = [];
  constructor(cb: IntersectionObserverCallback) {
    ioCallback = cb;
  }
  observe(el: Element): void {
    observed.push(el);
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

const revealAll = (): void => {
  act(() => {
    ioCallback?.(
      observed.map((target) => ({ isIntersecting: true, target }) as IntersectionObserverEntry),
      {} as IntersectionObserver,
    );
  });
};

const highlight = (page: number, color: PdfAnnotation['color']): PdfAnnotation => ({
  id: `${String(page)}-${color}`,
  mediaId: 'm1',
  spaceId: 's1',
  kind: 'highlight',
  page,
  rects: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.04 }],
  quote: 'q',
  color,
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
});

const blob = new Blob(['%PDF'], { type: 'application/pdf' });

const renderRail = (props: Partial<Parameters<typeof PdfThumbRail>[0]> = {}) =>
  renderWithProviders(
    <PdfThumbRail
      blob={blob}
      numPages={3}
      activePage={1}
      annotations={[]}
      onPageChange={vi.fn()}
      onPrev={vi.fn()}
      onNext={vi.fn()}
      {...props}
    />,
  );

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  requestPage.mockReset();
  thumbsRef.current = {};
  ioCallback = null;
  observed.length = 0;
});

describe('PdfThumbRail', () => {
  it('renders a labelled thumbnail per page inside the thumbnails region', () => {
    renderRail();
    expect(screen.getByRole('navigation', { name: 'Page thumbnails' })).toBeInTheDocument();
    expect(screen.getByTestId('pdf-thumb-1')).toHaveAccessibleName('Page 1');
    expect(screen.getByTestId('pdf-thumb-2')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-thumb-3')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-thumb-pager')).toHaveTextContent('1 / 3');
  });

  it('requests only the pages reported visible (lazy)', () => {
    renderRail();
    expect(requestPage).not.toHaveBeenCalled();
    revealAll();
    expect(requestPage).toHaveBeenCalledWith(1);
    expect(requestPage).toHaveBeenCalledWith(2);
    expect(requestPage).toHaveBeenCalledWith(3);
  });

  it('shows a resolved thumbnail image once the hook caches it', () => {
    thumbsRef.current = { 2: 'data:image/png;base64,AAA' };
    renderRail();
    expect(screen.getByTestId('pdf-thumb-2').querySelector('img')).toHaveAttribute(
      'src',
      'data:image/png;base64,AAA',
    );
    expect(screen.getByTestId('pdf-thumb-1').querySelector('img')).toBeNull();
  });

  it('draws one tick per distinct colour on a page', () => {
    renderRail({
      annotations: [highlight(2, 'yellow'), highlight(2, 'yellow'), highlight(2, 'pink')],
    });
    const button = screen.getByTestId('pdf-thumb-2');
    const ticks = button.querySelectorAll('[data-testid="pdf-thumb-tick"]');
    expect(ticks).toHaveLength(2);
  });

  it('navigates when a thumbnail is clicked', async () => {
    const onPageChange = vi.fn();
    renderRail({ onPageChange });
    await userEvent.click(screen.getByTestId('pdf-thumb-3'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('drives the foot pager', async () => {
    const onNext = vi.fn();
    renderRail({ activePage: 2, onNext });
    await userEvent.click(screen.getByTestId('pdf-thumb-pager-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
