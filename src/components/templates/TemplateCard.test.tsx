import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { getTemplate } from '@/data/templates';
import { TemplateCard } from './TemplateCard';

const blank = getTemplate('blank')!;

describe('TemplateCard', () => {
  it('exposes its selected state via aria-pressed', () => {
    const { rerender } = renderWithProviders(
      <TemplateCard tpl={blank} index={0} active={false} label="Blank" onSelect={vi.fn()} />,
    );
    const card = screen.getByTestId('templates-card-blank');
    expect(card).toHaveAttribute('aria-pressed', 'false');
    rerender(
      <TemplateCard tpl={blank} index={0} active label="Blank" onSelect={vi.fn()} />,
    );
    expect(card).toHaveAttribute('aria-pressed', 'true');
  });

  it('numbers the row from its index and calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <TemplateCard tpl={blank} index={2} active={false} label="Blank" onSelect={onSelect} />,
    );
    expect(screen.getByText('03')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('templates-card-blank'));
    expect(onSelect).toHaveBeenCalledWith(blank);
  });
});
