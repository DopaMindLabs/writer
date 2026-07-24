import { renderWithProviders, screen } from '@/test/test-utils';
import { SectionEmpty } from './SectionEmpty';

describe('SectionEmpty', () => {
  it('renders the empty placeholder for the section', () => {
    renderWithProviders(<SectionEmpty sectionId="sec1" />);
    expect(screen.getByTestId('sidebar-section-sec1-empty')).toHaveTextContent(
      '(empty)',
    );
  });

  it('keys the placeholder testid to the section id', () => {
    renderWithProviders(<SectionEmpty sectionId="sec-ws" />);
    expect(
      screen.getByTestId('sidebar-section-sec-ws-empty'),
    ).toBeInTheDocument();
  });

  it('indents the placeholder for a nested section', () => {
    renderWithProviders(<SectionEmpty sectionId="sec1" indented />);
    expect(screen.getByTestId('sidebar-section-sec1-empty')).toHaveClass('pl-7');
  });

  it('does not indent a top-level section placeholder', () => {
    renderWithProviders(<SectionEmpty sectionId="sec1" />);
    expect(screen.getByTestId('sidebar-section-sec1-empty')).not.toHaveClass(
      'pl-7',
    );
  });
});
