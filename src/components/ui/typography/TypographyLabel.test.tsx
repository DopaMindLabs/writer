import { renderWithProviders, screen } from '@/test/test-utils';
import { TypographyLabel } from './TypographyLabel';

describe('TypographyLabel', () => {
  it('renders a p element with the default variant', () => {
    renderWithProviders(<TypographyLabel>label</TypographyLabel>);
    const el = screen.getByText('label');
    expect(el.tagName).toBe('P');
    expect(el).toHaveClass(
      'font-mono',
      'uppercase',
      'text-[10px]',
      'tracking-[0.08em]',
      'text-ink-3',
    );
  });

  it('applies the wide variant', () => {
    renderWithProviders(<TypographyLabel variant="wide">wide</TypographyLabel>);
    expect(screen.getByText('wide')).toHaveClass(
      'text-[10px]',
      'tracking-wider',
    );
  });

  it('applies the xs variant', () => {
    renderWithProviders(<TypographyLabel variant="xs">xs</TypographyLabel>);
    expect(screen.getByText('xs')).toHaveClass('text-xs', 'tracking-wider');
  });

  it('renders through to the child tag when asChild is set', () => {
    renderWithProviders(
      <TypographyLabel asChild>
        <h3>section</h3>
      </TypographyLabel>,
    );
    const el = screen.getByText('section');
    expect(el.tagName).toBe('H3');
    expect(el).toHaveClass('font-mono', 'uppercase');
  });

  it('merges custom className', () => {
    renderWithProviders(
      <TypographyLabel className="mt-1 text-ink-4">x</TypographyLabel>,
    );
    expect(screen.getByText('x')).toHaveClass('mt-1', 'text-ink-4');
  });

  it('forwards ref', () => {
    const ref = { current: null as HTMLParagraphElement | null };
    renderWithProviders(<TypographyLabel ref={ref}>Ref</TypographyLabel>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('P');
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants and asChild', () => {
      const { container } = renderWithProviders(
        <div>
          <TypographyLabel variant="default">Default</TypographyLabel>
          <TypographyLabel variant="wide">Wide</TypographyLabel>
          <TypographyLabel variant="xs">Xs</TypographyLabel>
          <TypographyLabel asChild>
            <h3>As child</h3>
          </TypographyLabel>
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
