import { renderWithProviders, screen } from '@/test/test-utils';
import { TypographyH1 } from './TypographyH1';

describe('TypographyH1', () => {
  it('renders an h1 element with the display variant by default', () => {
    renderWithProviders(<TypographyH1>Heading</TypographyH1>);
    const heading = screen.getByText('Heading');
    expect(heading.tagName).toBe('H1');
    expect(heading).toHaveClass('font-serif', 'text-4xl', 'md:text-6xl');
  });

  it('applies the page variant', () => {
    renderWithProviders(<TypographyH1 variant="page">Page</TypographyH1>);
    expect(screen.getByText('Page')).toHaveClass('text-3xl', 'md:text-5xl');
  });

  it('applies the section variant', () => {
    renderWithProviders(
      <TypographyH1 variant="section">Section</TypographyH1>,
    );
    expect(screen.getByText('Section')).toHaveClass(
      'text-[32px]',
      'font-normal',
      'leading-tight',
    );
  });

  it('applies the compact variant', () => {
    renderWithProviders(
      <TypographyH1 variant="compact">Compact</TypographyH1>,
    );
    expect(screen.getByText('Compact')).toHaveClass(
      'text-[22px]',
      'font-medium',
    );
  });

  it('applies the simple variant', () => {
    renderWithProviders(<TypographyH1 variant="simple">Simple</TypographyH1>);
    expect(screen.getByText('Simple')).toHaveClass('text-3xl');
  });

  it('merges custom className', () => {
    renderWithProviders(
      <TypographyH1 className="mt-2 custom">Custom</TypographyH1>,
    );
    expect(screen.getByText('Custom')).toHaveClass('mt-2', 'custom');
  });

  it('forwards ref', () => {
    const ref = { current: null as HTMLHeadingElement | null };
    renderWithProviders(<TypographyH1 ref={ref}>Ref</TypographyH1>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('H1');
  });
});
