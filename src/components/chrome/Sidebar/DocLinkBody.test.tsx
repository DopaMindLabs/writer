import { type KeyboardEvent } from 'react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { sampleDoc } from '@/test/fixtures';
import type { InlineRename } from './Sidebar.types';
import { DocLinkBody } from './DocLinkBody';

const setup = (
  over: {
    editing?: boolean;
    draft?: string;
    active?: boolean;
    wordCount?: number;
    href?: string;
  } = {},
) => {
  const setDraft = vi.fn<(next: string) => void>();
  const beginEdit = vi.fn<() => void>();
  const commit = vi.fn<() => Promise<void>>(() => Promise.resolve());
  const onKeyDown = vi.fn<(e: KeyboardEvent<HTMLInputElement>) => void>();
  const rename: InlineRename = {
    editing: over.editing ?? false,
    draft: over.draft ?? sampleDoc.name,
    setDraft,
    beginEdit,
    commit,
    onKeyDown,
  };
  renderWithProviders(
    <DocLinkBody
      doc={sampleDoc}
      href={over.href ?? '/s/s1/d/d1'}
      active={over.active ?? false}
      wordCount={over.wordCount ?? 0}
      rename={rename}
    />,
  );
  return { setDraft, beginEdit, commit, onKeyDown };
};

describe('DocLinkBody', () => {
  it('links to the document and shows its name', () => {
    setup();
    const link = screen.getByTestId(`sidebar-doc-${sampleDoc.id}`);
    expect(link).toHaveAttribute('href', '/s/s1/d/d1');
    expect(
      screen.getByTestId(`sidebar-doc-${sampleDoc.id}-name`),
    ).toHaveTextContent('Sample Doc');
  });

  it('shows the empty glyph when the document has no words', () => {
    setup({ wordCount: 0 });
    expect(
      screen.getByTestId(`sidebar-doc-${sampleDoc.id}-count`),
    ).toHaveTextContent('◌');
  });

  it('shows a grouped word count when the document has words', () => {
    setup({ wordCount: 1234 });
    expect(
      screen.getByTestId(`sidebar-doc-${sampleDoc.id}-count`),
    ).toHaveTextContent((1234).toLocaleString());
  });

  it('emphasises the name when the document is active', () => {
    setup({ active: true });
    expect(
      screen.getByTestId(`sidebar-doc-${sampleDoc.id}-name`),
    ).toHaveClass('font-medium');
  });

  it('begins editing when the name is double-clicked', async () => {
    const user = userEvent.setup();
    const { beginEdit } = setup();
    await user.dblClick(screen.getByTestId(`sidebar-doc-${sampleDoc.id}`));
    expect(beginEdit).toHaveBeenCalledOnce();
  });

  describe('while renaming', () => {
    it('renders a labelled rename field seeded with the draft', () => {
      setup({ editing: true, draft: 'Working title' });
      const input = screen.getByTestId(
        `sidebar-doc-${sampleDoc.id}-rename-input`,
      );
      expect(input).toHaveValue('Working title');
      expect(input).toHaveAccessibleName('Rename document Sample Doc');
    });

    it('updates the draft as the user types', async () => {
      const user = userEvent.setup();
      const { setDraft } = setup({ editing: true, draft: 'Draft' });
      await user.type(
        screen.getByTestId(`sidebar-doc-${sampleDoc.id}-rename-input`),
        'x',
      );
      expect(setDraft).toHaveBeenCalledWith(expect.stringContaining('x'));
    });

    it('forwards key presses to the rename handler', async () => {
      const user = userEvent.setup();
      const { onKeyDown } = setup({ editing: true });
      await user.type(
        screen.getByTestId(`sidebar-doc-${sampleDoc.id}-rename-input`),
        '{Enter}',
      );
      expect(onKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'Enter' }),
      );
    });

    it('commits the rename when the field loses focus', async () => {
      const user = userEvent.setup();
      const { commit } = setup({ editing: true });
      await user.click(
        screen.getByTestId(`sidebar-doc-${sampleDoc.id}-rename-input`),
      );
      await user.tab();
      expect(commit).toHaveBeenCalledOnce();
    });
  });
});
