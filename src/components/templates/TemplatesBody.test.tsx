import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { listTemplates, type Template } from '@/data/templates';

import { TemplatesBody } from './TemplatesBody';

const templates = listTemplates();
const label = (tpl: Template) => tpl.label;
const description = (tpl: Template) => tpl.description;

describe('TemplatesBody', () => {
  it('renders a card per template and marks the selected one', () => {
    renderWithProviders(
      <TemplatesBody
        templates={templates}
        selectedId="blank"
        templateLabel={label}
        templateDescription={description}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('button', { pressed: false }).length).toBeGreaterThan(0);
    expect(screen.getByTestId('templates-card-blank')).toHaveAttribute('aria-pressed', 'true');
  });

  it('forwards the picked template to onSelect', async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <TemplatesBody
        templates={templates}
        selectedId="blank"
        templateLabel={label}
        templateDescription={description}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByTestId('templates-card-blank'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'blank' }));
  });
});
