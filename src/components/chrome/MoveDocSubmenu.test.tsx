import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleDoc, seedBasicSpace } from '@/test/fixtures';
import { WORKSHOP_SECTION_LABEL } from '@/lib/sections';
import type { Section } from '@/db/schema';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoveDocSubmenu } from './MoveDocSubmenu';

const research: Section = {
  id: 'sec2',
  spaceId: 's1',
  parentSectionId: null,
  label: 'Research',
  order: 1,
};

const workshop: Section = {
  id: 'wk1',
  spaceId: 's1',
  parentSectionId: null,
  label: WORKSHOP_SECTION_LABEL,
  order: 2,
};

const renderMenu = () =>
  renderWithProviders(
    <DropdownMenu>
      <DropdownMenuTrigger>open</DropdownMenuTrigger>
      <DropdownMenuContent>
        <MoveDocSubmenu doc={sampleDoc} />
      </DropdownMenuContent>
    </DropdownMenu>,
  );

const moveTrigger = () =>
  screen.findByTestId(`sidebar-doc-${sampleDoc.id}-move`);

const openSubmenu = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'open' }));
  await moveTrigger();
  await userEvent.keyboard('{ArrowDown}{ArrowRight}');
};

describe('MoveDocSubmenu', () => {
  beforeEach(async () => {
    await seedBasicSpace();
  });

  it('names the trigger "Move to" and marks it as owning a submenu', async () => {
    await db.sections.put(research);
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    const trigger = await screen.findByRole('menuitem', { name: 'Move to' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('lists sibling top-level sections, excluding the current section and Workshop', async () => {
    await db.sections.bulkPut([research, workshop]);
    renderMenu();
    await openSubmenu();

    expect(
      await screen.findByTestId(`sidebar-doc-${sampleDoc.id}-move-sec2`),
    ).toBeInTheDocument();
    // The doc's own section (Drafts/sec1) and the Workshop are never targets.
    expect(
      screen.queryByTestId(`sidebar-doc-${sampleDoc.id}-move-sec1`),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`sidebar-doc-${sampleDoc.id}-move-wk1`),
    ).not.toBeInTheDocument();
  });

  it('moves the document into the chosen section', async () => {
    await db.sections.put(research);
    renderMenu();
    await openSubmenu();

    await userEvent.click(
      await screen.findByTestId(`sidebar-doc-${sampleDoc.id}-move-sec2`),
    );

    await waitFor(async () => {
      expect((await db.docs.get(sampleDoc.id))?.sectionId).toBe('sec2');
    });
  });

  it('disables the trigger when the space has no other section to move to', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(await moveTrigger()).toHaveAttribute('data-disabled');
  });
});
