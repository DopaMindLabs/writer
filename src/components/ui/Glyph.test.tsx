import { render } from '@/test/test-utils';
import { Glyph } from './Glyph';

describe('Glyph', () => {
  describe('rendering', () => {
    it('should render the given glyph node', () => {
      const { getByTestId } = render(
        <Glyph data-testid="g-text" label="More">
          ⋯
        </Glyph>,
      );
      expect(getByTestId('g-text')).toHaveTextContent('⋯');
    });

    it('should expose the label as aria-label', () => {
      const { getByTestId } = render(
        <Glyph data-testid="g-aria" label="More">
          ⋯
        </Glyph>,
      );
      expect(getByTestId('g-aria')).toHaveAttribute('aria-label', 'More');
    });

    it('should render as type=button by default', () => {
      const { getByTestId } = render(
        <Glyph data-testid="g-type" label="x">
          x
        </Glyph>,
      );
      expect(getByTestId('g-type')).toHaveAttribute('type', 'button');
    });

    it('should apply the given size to width, height, and font-size', () => {
      const { getByTestId } = render(
        <Glyph data-testid="g-size" label="x" size={22}>
          x
        </Glyph>,
      );
      const el = getByTestId('g-size');
      expect(el.style.width).toBe('22px');
      expect(el.style.height).toBe('22px');
      expect(el.style.fontSize).toBe('11px');
    });
  });

  describe('variants', () => {
    it('should apply the off-state classes by default', () => {
      const { getByTestId } = render(
        <Glyph data-testid="g-off" label="x">
          x
        </Glyph>,
      );
      const el = getByTestId('g-off');
      expect(el.className).toContain('text-ink-3');
      expect(el.className).toContain('font-normal');
      expect(el).not.toHaveAttribute('aria-pressed');
    });

    it('should apply on-state classes and aria-pressed when on=true', () => {
      const { getByTestId } = render(
        <Glyph data-testid="g-on" label="x" on>
          x
        </Glyph>,
      );
      const el = getByTestId('g-on');
      expect(el.className).toContain('text-ink');
      expect(el.className).toContain('font-semibold');
      expect(el).toHaveAttribute('aria-pressed', 'true');
    });

    it('should apply aria-pressed=false when on=false', () => {
      const { getByTestId } = render(
        <Glyph data-testid="g-off-explicit" label="x" on={false}>
          x
        </Glyph>,
      );
      expect(getByTestId('g-off-explicit')).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });

    it('should apply italic-serif classes when italic=true (help-glyph case)', () => {
      const { getByTestId } = render(
        <Glyph data-testid="g-italic" label="Help" italic>
          ?
        </Glyph>,
      );
      const el = getByTestId('g-italic');
      expect(el.className).toContain('font-serif');
      expect(el.className).toContain('italic');
    });

    it('should default to sans when italic is not set', () => {
      const { getByTestId } = render(
        <Glyph data-testid="g-sans" label="x">
          x
        </Glyph>,
      );
      expect(getByTestId('g-sans').className).toContain('font-sans');
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = render(
        <div>
          <Glyph data-testid="g-snap-off" label="more">
            ⋯
          </Glyph>
          <Glyph data-testid="g-snap-on" label="more on" on>
            ⋯
          </Glyph>
          <Glyph data-testid="g-snap-italic" label="help" italic>
            ?
          </Glyph>
          <Glyph data-testid="g-snap-size" label="big" size={22}>
            ⋯
          </Glyph>
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
