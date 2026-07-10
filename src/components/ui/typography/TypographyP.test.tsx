import { renderWithProviders, screen } from '@/test/test-utils';
import { TypographyP } from './TypographyP';

describe('TypographyP', () => {
  it('renders a p element with the body variant by default', () => {
    renderWithProviders(<TypographyP>Body</TypographyP>);
    const para = screen.getByText('Body');
    expect(para.tagName).toBe('P');
    expect(para).toHaveClass(
      'font-serif',
      'text-base',
      'leading-relaxed',
      'md:text-[18px]',
    );
  });

  it('applies the lead variant', () => {
    renderWithProviders(<TypographyP variant="lead">Lead</TypographyP>);
    expect(screen.getByText('Lead')).toHaveClass(
      'text-[17px]',
      'leading-relaxed',
    );
  });

  it('applies the tagline variant', () => {
    renderWithProviders(<TypographyP variant="tagline">Tag</TypographyP>);
    expect(screen.getByText('Tag')).toHaveClass('text-[18px]', 'italic');
  });

  it('applies the description variant', () => {
    renderWithProviders(<TypographyP variant="description">Desc</TypographyP>);
    expect(screen.getByText('Desc')).toHaveClass('text-base', 'text-ink-3');
  });

  it('applies the caption variant', () => {
    renderWithProviders(<TypographyP variant="caption">Cap</TypographyP>);
    expect(screen.getByText('Cap')).toHaveClass(
      'text-[13px]',
      'italic',
      'text-ink-3',
    );
  });

  it('applies the empty variant', () => {
    renderWithProviders(<TypographyP variant="empty">Empty</TypographyP>);
    expect(screen.getByText('Empty')).toHaveClass('text-2xl', 'text-ink');
  });

  it('applies the emptyHint variant', () => {
    renderWithProviders(
      <TypographyP variant="emptyHint">Hint</TypographyP>,
    );
    expect(screen.getByText('Hint')).toHaveClass(
      'text-[20px]',
      'italic',
      'text-ink-3',
    );
  });

  it('merges custom className', () => {
    renderWithProviders(
      <TypographyP className="mt-4 custom">Custom</TypographyP>,
    );
    expect(screen.getByText('Custom')).toHaveClass('mt-4', 'custom');
  });

  it('forwards ref', () => {
    const ref = { current: null as HTMLParagraphElement | null };
    renderWithProviders(<TypographyP ref={ref}>Ref</TypographyP>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('P');
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = renderWithProviders(
        <div>
          <TypographyP variant="body">Body</TypographyP>
          <TypographyP variant="lead">Lead</TypographyP>
          <TypographyP variant="tagline">Tagline</TypographyP>
          <TypographyP variant="description">Description</TypographyP>
          <TypographyP variant="caption">Caption</TypographyP>
          <TypographyP variant="empty">Empty</TypographyP>
          <TypographyP variant="emptyHint">Empty hint</TypographyP>
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
