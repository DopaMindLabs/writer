import { renderWithProviders, screen } from '@/test/test-utils';
import { getTemplate } from '@/data/templates';
import { TemplateStage } from '@/data/templates/types';
import { TemplateCardTitle } from './TemplateCardTitle';

const blank = getTemplate('blank')!;

describe('TemplateCardTitle', () => {
  it('renders the label and a stage chip for a non-stable template', () => {
    renderWithProviders(<TemplateCardTitle tpl={blank} label="Blank" />);
    expect(screen.getByText('Blank')).toBeInTheDocument();
    // The Alpha stage surfaces as its "early" chip label.
    expect(screen.getByText(/early/i)).toBeInTheDocument();
  });

  it('omits the stage chip for a stable template', () => {
    renderWithProviders(
      <TemplateCardTitle tpl={{ ...blank, stage: TemplateStage.Stable }} label="Blank" />,
    );
    expect(screen.queryByText(/early/i)).toBeNull();
  });

  it('shows the description when one is given, and nothing extra when not', () => {
    const { rerender } = renderWithProviders(
      <TemplateCardTitle tpl={blank} label="Blank" description="A blank canvas" />,
    );
    expect(screen.getByText('A blank canvas')).toBeInTheDocument();
    rerender(<TemplateCardTitle tpl={blank} label="Blank" />);
    expect(screen.queryByText('A blank canvas')).toBeNull();
  });
});
