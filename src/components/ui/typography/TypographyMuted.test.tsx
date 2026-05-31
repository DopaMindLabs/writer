import { renderWithProviders, screen } from '@/test/test-utils';
import { TypographyMuted } from './TypographyMuted';

describe('TypographyMuted', () => {
  it('renders a p element with the default variant', () => {
    renderWithProviders(<TypographyMuted>muted</TypographyMuted>);
    const para = screen.getByText('muted');
    expect(para.tagName).toBe('P');
    expect(para).toHaveClass('text-sm', 'text-ink-3');
  });

  it('applies the xs variant', () => {
    renderWithProviders(<TypographyMuted variant="xs">xs</TypographyMuted>);
    expect(screen.getByText('xs')).toHaveClass('text-xs', 'text-ink-3');
  });

  it('merges custom className', () => {
    renderWithProviders(
      <TypographyMuted className="mt-2 extra">x</TypographyMuted>,
    );
    expect(screen.getByText('x')).toHaveClass('mt-2', 'extra');
  });

  it('forwards ref', () => {
    const ref = { current: null as HTMLParagraphElement | null };
    renderWithProviders(<TypographyMuted ref={ref}>Ref</TypographyMuted>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('P');
  });
});
