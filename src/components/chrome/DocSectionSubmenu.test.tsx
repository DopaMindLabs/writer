import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { sampleDoc, seedBasicSpace } from '@/test/fixtures';
import { db } from '@/db/db';
import type { Section } from '@/db/schema';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DocSectionSubmenu } from './DocSectionSubmenu';

const NOTES_SECTION: Section = {
  id: 'sec2',
  spaceId: 's1',
  parentSectionId: null,
  label: 'Notes',
  order: 1,
};

const setup = () => {
  const onDone = vi.fn();
  renderWithProviders(
    <DropdownMenu open>
      <DropdownMenuTrigger>open</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DocSectionSubmenu doc={sampleDoc} onDone={onDone} />
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  return { onDone };
};

const openSubmenu = async () => {
  await userEvent.click(
    await screen.findByTestId(`sidebar-doc-${sampleDoc.id}-move`),
  );
};

describe('DocSectionSubmenu', () => {
  beforeEach(async () => {
    await seedBasicSpace();
    await db.sections.put(NOTES_SECTION);
  });

  it('lists top-level sections only, ticking the current one', async () => {
    setup();
    await openSubmenu();
    expect(await screen.findByRole('option', { name: 'Drafts' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('option', { name: 'Notes' })).toBeInTheDocument();
    // The subsection "Ideas" is not offered as a move target yet.
    expect(screen.queryByRole('option', { name: 'Ideas' })).not.toBeInTheDocument();
  });

  it('moves the document to the chosen section and closes the menu', async () => {
    const { onDone } = setup();
    await openSubmenu();
    await userEvent.click(await screen.findByRole('option', { name: 'Notes' }));
    expect(onDone).toHaveBeenCalledOnce();
    await waitFor(async () => {
      const moved = await db.docs.get(sampleDoc.id);
      expect(moved?.sectionId).toBe('sec2');
    });
  });

  it('is a no-op when the current section is chosen, but still closes', async () => {
    const { onDone } = setup();
    await openSubmenu();
    await userEvent.click(await screen.findByRole('option', { name: 'Drafts' }));
    expect(onDone).toHaveBeenCalledOnce();
    const unchanged = await db.docs.get(sampleDoc.id);
    expect(unchanged?.sectionId).toBe('sec1');
  });
});
