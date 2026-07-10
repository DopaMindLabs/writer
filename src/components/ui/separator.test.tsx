import { render } from '@/test/test-utils';
import { Separator } from './separator';

describe('Separator', () => {
  describe('rendering', () => {
    it('should render a horizontal separator by default', () => {
      const { getByTestId } = render(<Separator data-testid="sep-h" />);
      const el = getByTestId('sep-h');
      expect(el.className).toContain('h-px');
      expect(el.className).toContain('w-full');
    });

    it('should render a vertical separator when orientation=vertical', () => {
      const { getByTestId } = render(
        <Separator data-testid="sep-v" orientation="vertical" />,
      );
      const el = getByTestId('sep-v');
      expect(el.className).toContain('w-px');
      expect(el.className).toContain('h-full');
    });
  });

  describe('variants', () => {
    it('should use bg-rule by default', () => {
      const { getByTestId } = render(<Separator data-testid="sep-rest" />);
      expect(getByTestId('sep-rest').className).toContain('bg-rule');
      expect(getByTestId('sep-rest').className).not.toContain('bg-rule-s');
    });

    it('should use bg-rule-s when light is set', () => {
      const { getByTestId } = render(<Separator data-testid="sep-light" light />);
      expect(getByTestId('sep-light').className).toContain('bg-rule-s');
    });

    it('should combine light + vertical correctly', () => {
      const { getByTestId } = render(
        <Separator data-testid="sep-lv" light orientation="vertical" />,
      );
      const el = getByTestId('sep-lv');
      expect(el.className).toContain('bg-rule-s');
      expect(el.className).toContain('w-px');
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = render(
        <div>
          <Separator data-testid="sep-snap-h" />
          <Separator data-testid="sep-snap-h-light" light />
          <Separator data-testid="sep-snap-v" orientation="vertical" />
          <Separator data-testid="sep-snap-v-light" orientation="vertical" light />
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
