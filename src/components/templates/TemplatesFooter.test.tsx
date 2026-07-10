import { vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { TemplatesFooter } from './TemplatesFooter';

const baseProps = {
  name: 'My space',
  tag: 'MS',
  submitting: false,
  canSubmit: true,
  submitLabel: 'Enter Blank',
  onNameChange: vi.fn(),
  onTagChange: vi.fn(),
};

describe('TemplatesFooter', () => {
  it('composes the name/tag fields and the submit action', () => {
    renderWithProviders(<TemplatesFooter {...baseProps} />);
    expect(screen.getByTestId('templates-name-input')).toHaveValue('My space');
    expect(screen.getByTestId('templates-tag-input')).toHaveValue('MS');
    expect(screen.getByTestId('templates-submit')).toBeEnabled();
  });
});
