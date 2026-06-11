import { render, waitFor } from '@testing-library/react';
import { SettingsSectionStack } from './SettingsSectionStack';

const sections = [
  { id: 'a', node: <div>Section A</div> },
  { id: 'b', node: <div>Section B</div> },
  { id: 'c', node: <div>Section C</div> },
];

describe('SettingsSectionStack', () => {
  let scrollIntoView: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView =
      scrollIntoView as unknown as (typeof Element.prototype.scrollIntoView);
  });

  afterEach(() => {
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
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

  it('scrolls the target section into view on mount', async () => {
    render(
      <SettingsSectionStack sections={sections} scrollTarget="b" scrollNonce={0} />,
    );
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    });
  });

  it('uses a smooth scroll by default but an instant jump under reduced motion', async () => {
    document.documentElement.setAttribute('data-motion', 'reduced');
    const { unmount } = render(
      <SettingsSectionStack sections={sections} scrollTarget="b" scrollNonce={0} />,
    );
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'start',
      });
    });
    unmount();
    document.documentElement.removeAttribute('data-motion');

    scrollIntoView.mockClear();
    render(
      <SettingsSectionStack sections={sections} scrollTarget="b" scrollNonce={0} />,
    );
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    });
  });

  it('re-scrolls when the nonce changes even if the target is unchanged', async () => {
    const { rerender } = render(
      <SettingsSectionStack sections={sections} scrollTarget="b" scrollNonce={0} />,
    );
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    });
    rerender(
      <SettingsSectionStack sections={sections} scrollTarget="b" scrollNonce={1} />,
    );
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledTimes(2);
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
