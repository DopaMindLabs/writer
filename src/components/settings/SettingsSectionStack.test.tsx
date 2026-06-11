import { render, waitFor } from '@testing-library/react';
import { SettingsSectionStack } from './SettingsSectionStack';

const sections = [
  { id: 'a', node: <div>Section A</div> },
  { id: 'b', node: <div>Section B</div> },
  { id: 'c', node: <div>Section C</div> },
];

describe('SettingsSectionStack', () => {
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollTo = vi.fn();
    Element.prototype.scrollTo =
      scrollTo as unknown as (typeof Element.prototype.scrollTo);
  });

  afterEach(() => {
    delete (Element.prototype as { scrollTo?: unknown }).scrollTo;
    document.documentElement.removeAttribute('data-motion');
    vi.unstubAllGlobals();
  });

  it('renders every section stacked with a stable anchor id', () => {
    const { getByText, container } = render(
      <SettingsSectionStack sections={sections} scrollTarget="a" scrollNonce={0} />,
    );
    expect(getByText('Section A')).toBeInTheDocument();
    expect(getByText('Section B')).toBeInTheDocument();
    expect(container.querySelector('#settings-section-c')).not.toBeNull();
    expect(container.querySelector('#settings-section-b')).toHaveClass(
      'border-t',
    );
    expect(container.querySelector('#settings-section-a')).not.toHaveClass(
      'border-t',
    );
  });

  it('scrolls the pane to the target section on mount without touching ancestors', async () => {
    render(
      <SettingsSectionStack sections={sections} scrollTarget="b" scrollNonce={0} />,
    );
    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledTimes(1);
    });
  });

  it('uses a smooth scroll by default but an instant jump under reduced motion', async () => {
    document.documentElement.setAttribute('data-motion', 'reduced');
    const { unmount } = render(
      <SettingsSectionStack sections={sections} scrollTarget="b" scrollNonce={0} />,
    );
    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: 'auto' }),
      );
    });
    unmount();
    document.documentElement.removeAttribute('data-motion');

    scrollTo.mockClear();
    render(
      <SettingsSectionStack sections={sections} scrollTarget="b" scrollNonce={0} />,
    );
    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: 'smooth' }),
      );
    });
  });

  it('re-scrolls when the nonce changes even if the target is unchanged', async () => {
    const { rerender } = render(
      <SettingsSectionStack sections={sections} scrollTarget="b" scrollNonce={0} />,
    );
    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledTimes(1);
    });
    rerender(
      <SettingsSectionStack sections={sections} scrollTarget="b" scrollNonce={1} />,
    );
    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledTimes(2);
    });
  });

  it('reports the section nearest the top through onVisibleChange (scroll-spy)', () => {
    const triggers: (() => void)[] = [];
    class MockObserver {
      private readonly cb: IntersectionObserverCallback;
      constructor(cb: IntersectionObserverCallback) {
        this.cb = cb;
        triggers.push(() => {
          this.cb([], this as unknown as IntersectionObserver);
        });
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal('IntersectionObserver', MockObserver);

    const onVisibleChange = vi.fn();
    const { container } = render(
      <SettingsSectionStack
        sections={sections}
        scrollTarget="missing"
        scrollNonce={0}
        onVisibleChange={onVisibleChange}
      />,
    );

    const tops: Record<string, number> = { a: 10, b: 50, c: 300 };
    for (const id of ['a', 'b', 'c']) {
      const el = container.querySelector(`#settings-section-${id}`);
      if (el) el.getBoundingClientRect = () => ({ top: tops[id] }) as DOMRect;
    }

    onVisibleChange.mockClear();
    triggers.forEach((fire) => {
      fire();
    });
    expect(onVisibleChange).toHaveBeenLastCalledWith('b');
  });
});
