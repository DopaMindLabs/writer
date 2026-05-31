import { renderWithProviders, screen } from '@/test/test-utils';
import { TypographyH2 } from './TypographyH2';

describe('TypographyH2', () => {
  it('renders an h2 element with the default variant', () => {
    renderWithProviders(<TypographyH2>Section</TypographyH2>);
    const heading = screen.getByText('Section');
    expect(heading.tagName).toBe('H2');
    expect(heading).toHaveClass(
      'font-serif',
      'text-[18px]',
      'font-medium',
      'text-ink',
    );
  });

  it('merges custom className', () => {
    renderWithProviders(
      <TypographyH2 className="mt-4 extra">Section</TypographyH2>,
    );
    expect(screen.getByText('Section')).toHaveClass('mt-4', 'extra');
  });

  it('forwards ref', () => {
    const ref = { current: null as HTMLHeadingElement | null };
    renderWithProviders(<TypographyH2 ref={ref}>Ref</TypographyH2>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('H2');
  });

  describe('snapshot', () => {
    it('should match the snapshot of the default variant', () => {
      const { container } = renderWithProviders(
        <div>
          <TypographyH2 variant="default">Default</TypographyH2>
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
