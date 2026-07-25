import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import type { InlineRename } from './Sidebar.types';
import { SectionLabel } from './SectionLabel';

const makeRename = (over: Partial<InlineRename> = {}): InlineRename => ({
  editing: false,
  draft: 'Drafts',
  error: null,
  setDraft: vi.fn(),
  beginEdit: vi.fn(),
  commit: vi.fn(() => Promise.resolve(true)),
  onKeyDown: vi.fn(),
  ...over,
});

describe('SectionLabel', () => {
  it('renders the section label as a button when not editing', () => {
    renderWithProviders(
      <SectionLabel
        sectionId="sec1"
        label="Drafts"
        canModify
        rename={makeRename()}
      />,
    );
    expect(screen.getByTestId('sidebar-section-sec1-label')).toHaveTextContent(
      'Drafts',
    );
  });

  it('marks the label as drag-through so pressing it can start a section drag', () => {
    renderWithProviders(
      <SectionLabel
        sectionId="sec1"
        label="Drafts"
        canModify
        rename={makeRename()}
      />,
    );
    expect(screen.getByTestId('sidebar-section-sec1-label')).toHaveAttribute(
      'data-drag-through',
    );
  });

  it('offers a rename hint and begins editing on double-click when modifiable', async () => {
    const user = userEvent.setup();
    const beginEdit = vi.fn();
    renderWithProviders(
      <SectionLabel
        sectionId="sec1"
        label="Drafts"
        canModify
        rename={makeRename({ beginEdit })}
      />,
    );
    const label = screen.getByTestId('sidebar-section-sec1-label');
    expect(label).toHaveAttribute('title', 'Rename (double-click)');
    await user.dblClick(label);
    expect(beginEdit).toHaveBeenCalledOnce();
  });

  it('does not begin editing on double-click when not modifiable', async () => {
    const user = userEvent.setup();
    const beginEdit = vi.fn();
    renderWithProviders(
      <SectionLabel
        sectionId="sec1"
        label="Workshop"
        canModify={false}
        rename={makeRename({ beginEdit, draft: 'Workshop' })}
      />,
    );
    const label = screen.getByTestId('sidebar-section-sec1-label');
    expect(label).not.toHaveAttribute('title');
    await user.dblClick(label);
    expect(beginEdit).not.toHaveBeenCalled();
  });

  it('renders an inline rename field carrying the draft while editing', () => {
    renderWithProviders(
      <SectionLabel
        sectionId="sec1"
        label="Drafts"
        canModify
        rename={makeRename({ editing: true, draft: 'Draft notes' })}
      />,
    );
    const input = screen.getByTestId('sidebar-section-sec1-rename-input');
    expect(input).toHaveValue('Draft notes');
    expect(input).toHaveAccessibleName('Rename section Drafts');
  });

  it('wires the editing field to the rename controller', async () => {
    const user = userEvent.setup();
    const setDraft = vi.fn();
    const onKeyDown = vi.fn();
    const commit = vi.fn(() => Promise.resolve(true));
    renderWithProviders(
      <SectionLabel
        sectionId="sec1"
        label="Drafts"
        canModify
        rename={makeRename({ editing: true, setDraft, onKeyDown, commit })}
      />,
    );
    const input = screen.getByTestId('sidebar-section-sec1-rename-input');
    await user.type(input, 'x');
    expect(setDraft).toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(onKeyDown).toHaveBeenCalled();
    await user.tab();
    expect(commit).toHaveBeenCalled();
  });
});
