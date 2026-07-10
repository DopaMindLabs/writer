import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { TemplatesFooterFields } from './TemplatesFooterFields';

describe('TemplatesFooterFields', () => {
  it('shows the current name and tag values', () => {
    renderWithProviders(
      <TemplatesFooterFields name="My space" tag="MS" onNameChange={vi.fn()} onTagChange={vi.fn()} />,
    );
    expect(screen.getByTestId('templates-name-input')).toHaveValue('My space');
    expect(screen.getByTestId('templates-tag-input')).toHaveValue('MS');
  });

  it('reports name edits and upper-cases tag edits', async () => {
    const onNameChange = vi.fn();
    const onTagChange = vi.fn();
    renderWithProviders(
      <TemplatesFooterFields name="" tag="" onNameChange={onNameChange} onTagChange={onTagChange} />,
    );
    await userEvent.type(screen.getByTestId('templates-name-input'), 'A');
    expect(onNameChange).toHaveBeenCalledWith('A');
    await userEvent.type(screen.getByTestId('templates-tag-input'), 'a');
    expect(onTagChange).toHaveBeenCalledWith('A');
  });
});
