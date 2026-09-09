import { render, screen } from '@/test/test-utils';
import { SectionLabel } from './SectionLabel';

describe('SectionLabel', () => {
  it('renders the label in the mono voice', () => {
    render(<SectionLabel>Appearance</SectionLabel>);
    expect(screen.getByText('Appearance')).toHaveClass('font-mono');
  });

  it('defaults to size 10 / ink-3', () => {
    render(<SectionLabel>Writing</SectionLabel>);
    const label = screen.getByText('Writing');
    expect(label).toHaveClass('text-[10px]', 'text-ink-3');
  });

  it('supports the tighter 9 / ink-4 group eyebrow', () => {
    render(
      <SectionLabel size={9} tone="ink4">
        More
      </SectionLabel>,
    );
    const label = screen.getByText('More');
    expect(label).toHaveClass('text-[9px]', 'text-ink-4');
  });

  it('renders as a div by default', () => {
    render(<SectionLabel>Data</SectionLabel>);
    expect(screen.getByText('Data').tagName).toBe('DIV');
  });

  it('adopts the child element via asChild', () => {
    render(
      <SectionLabel asChild>
        <h2>Account</h2>
      </SectionLabel>,
    );
    const heading = screen.getByRole('heading', { name: 'Account' });
    expect(heading.tagName).toBe('H2');
    expect(heading).toHaveClass('font-mono');
  });
});
