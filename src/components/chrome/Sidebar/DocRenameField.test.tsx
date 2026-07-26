import { vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { sampleDoc } from '@/test/fixtures';
import type { InlineRename } from './Sidebar.types';
import { DocRenameField } from './DocRenameField';

const makeRename = (over: Partial<InlineRename> = {}): InlineRename => ({
  editing: true,
  draft: 'Sample Doc',
  error: null,
  setDraft: vi.fn(),
  beginEdit: vi.fn(),
  commit: vi.fn(() => Promise.resolve(true)),
  onKeyDown: vi.fn(),
  ...over,
});

describe('DocRenameField', () => {
  it('renders the rename input without an error by default', () => {
    renderWithProviders(
      <DocRenameField doc={sampleDoc} rename={makeRename()} />,
    );
    const input = screen.getByTestId(`sidebar-doc-${sampleDoc.id}-rename-input`);
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(
      screen.queryByTestId(`sidebar-doc-${sampleDoc.id}-rename-error`),
    ).not.toBeInTheDocument();
  });

  it('renders a failed save as an accessible inline error', () => {
    renderWithProviders(
      <DocRenameField
        doc={sampleDoc}
        rename={makeRename({ error: 'could not save' })}
      />,
    );
    const input = screen.getByTestId(`sidebar-doc-${sampleDoc.id}-rename-input`);
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('could not save');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });
});
