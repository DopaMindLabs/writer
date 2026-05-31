import { renderWithProviders, screen } from '@/test/test-utils';
import { TypographyLead } from './TypographyLead';

describe('TypographyLead', () => {
  it('renders a p element with the lead variant classes', () => {
    renderWithProviders(<TypographyLead>Lead text</TypographyLead>);
    const para = screen.getByText('Lead text');
    expect(para.tagName).toBe('P');
    expect(para).toHaveClass(
      'font-serif',
      'text-[17px]',
      'leading-relaxed',
      'text-ink-2',
    );
  });

  it('merges custom className', () => {
    renderWithProviders(
      <TypographyLead className="text-[color:var(--warning)]">warn</TypographyLead>,
    );
    expect(screen.getByText('warn')).toHaveClass('text-[color:var(--warning)]');
  });

  it('forwards ref', () => {
    const ref = { current: null as HTMLParagraphElement | null };
    renderWithProviders(<TypographyLead ref={ref}>Ref</TypographyLead>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('P');
  });
});
