import { render } from '@/test/test-utils';
import { Label } from './Label';

describe('Label', () => {
  describe('rendering', () => {
    it('should render the given text', () => {
      const { getByTestId } = render(
        <Label data-testid="lbl-text">Document name</Label>,
      );
      expect(getByTestId('lbl-text')).toHaveTextContent('Document name');
    });

    it('should forward htmlFor to the underlying label element', () => {
      const { getByTestId } = render(
        <Label data-testid="lbl-for" htmlFor="doc-name">
          Doc
        </Label>,
      );
      expect(getByTestId('lbl-for')).toHaveAttribute('for', 'doc-name');
    });
  });

  describe('variants', () => {
    it('should default to ink tone and medium weight', () => {
      const { getByTestId } = render(<Label data-testid="lbl-def">x</Label>);
      const el = getByTestId('lbl-def');
      expect(el.className).toContain('text-ink');
      expect(el.className).toContain('font-medium');
    });

    it('should apply the ink2 tone variant', () => {
      const { getByTestId } = render(
        <Label data-testid="lbl-ink2" tone="ink2">
          x
        </Label>,
      );
      expect(getByTestId('lbl-ink2').className).toContain('text-ink-2');
    });

    it('should apply the ink3 tone variant', () => {
      const { getByTestId } = render(
        <Label data-testid="lbl-ink3" tone="ink3">
          x
        </Label>,
      );
      expect(getByTestId('lbl-ink3').className).toContain('text-ink-3');
    });

    it('should apply the regular weight variant', () => {
      const { getByTestId } = render(
        <Label data-testid="lbl-reg" weight="regular">
          x
        </Label>,
      );
      expect(getByTestId('lbl-reg').className).toContain('font-normal');
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = render(
        <div>
          <Label data-testid="lbl-snap-ink">ink medium</Label>
          <Label data-testid="lbl-snap-ink2" tone="ink2" weight="regular">
            ink2 regular
          </Label>
          <Label data-testid="lbl-snap-ink3" tone="ink3">
            ink3 medium
          </Label>
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
