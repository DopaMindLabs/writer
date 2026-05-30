import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAtRoute, screen } from '@/test/test-utils';
import { db } from '@/db/db';
import {
  FIXED_TIME,
  sampleDoc,
  sampleNote,
  sampleSection,
  sampleSpace,
  seedBasicSpace,
} from '@/test/fixtures';
import type { Annotation, Backup, Citation, Connection } from '@/db/schema';
import { SpaceSettingsScreen } from './SpaceSettings';
import { deleteSpaceCascade } from '@/lib/space/deleteSpaceCascade';

const renderAtSpaceSettings = (initialPath = '/s/s1/settings') => {
  return renderAtRoute(<SpaceSettingsScreen />, {
    path: '/s/:spaceId/settings',
    initialEntries: [initialPath],
  });
};

describe('SpaceSettingsScreen', () => {
  describe('rendering', () => {
    it('should render the General tab with the space name and tag by default', async () => {
      await seedBasicSpace();
      renderAtSpaceSettings();
      expect(
        await screen.findByTestId('space-settings-tab-general'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('space-settings-name-input')).toHaveValue(
        'Test Space',
      );
      expect(screen.getByTestId('space-settings-tag-input')).toHaveValue('TST');
    });

    it('should show a loading placeholder when the space has not loaded yet', async () => {
      renderAtSpaceSettings('/s/nope/settings');
      expect(
        await screen.findByTestId('space-settings-loading'),
      ).toBeInTheDocument();
    });

    it('should render the world rail with the current space as the back affordance', async () => {
      await seedBasicSpace();
      renderAtSpaceSettings();
      const spaceLink = await screen.findByTestId('space-rail-space-s1');
      expect(spaceLink).toHaveAttribute('href', '/s/s1');
      expect(spaceLink).toHaveTextContent('TST');
    });
  });

  describe('name input', () => {
    it('should persist a rename via Enter', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderAtSpaceSettings();
      const nameInput = await screen.findByTestId('space-settings-name-input');
      await user.clear(nameInput);
      await user.type(nameInput, 'Renamed Space{enter}');
      await waitFor(async () => {
        expect((await db.spaces.get('s1'))?.name).toBe('Renamed Space');
      });
    });

    it('should revert an unchanged or empty name without writing to Dexie', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      const updateSpy = vi.spyOn(db.spaces, 'update');
      renderAtSpaceSettings();
      const nameInput = await screen.findByTestId('space-settings-name-input');
      await user.clear(nameInput);
      nameInput.blur();
      await waitFor(() =>
        expect(nameInput).toHaveValue('Test Space'),
      );
      expect(updateSpy).not.toHaveBeenCalled();
      updateSpy.mockRestore();
    });

    it('should revert to the original value when Escape is pressed', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderAtSpaceSettings();
      const nameInput = await screen.findByTestId('space-settings-name-input');
      await user.clear(nameInput);
      await user.type(nameInput, 'Throwaway{escape}');
      expect(nameInput).toHaveValue('Test Space');
    });

    it('should not write to the DB when blurred with an unchanged name', async () => {
      await seedBasicSpace();
      const updateSpy = vi.spyOn(db.spaces, 'update');
      renderAtSpaceSettings();
      const nameInput = await screen.findByTestId('space-settings-name-input');
      nameInput.focus();
      nameInput.blur();
      expect(updateSpy).not.toHaveBeenCalled();
      updateSpy.mockRestore();
    });
  });

  describe('tag input', () => {
    it('should persist a tag change via blur', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderAtSpaceSettings();
      const tagInput = await screen.findByTestId('space-settings-tag-input');
      await user.clear(tagInput);
      await user.type(tagInput, 'NEW');
      tagInput.blur();
      await waitFor(async () => {
        expect((await db.spaces.get('s1'))?.tag).toBe('NEW');
      });
    });

    it('should revert an empty tag without writing', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      const updateSpy = vi.spyOn(db.spaces, 'update');
      renderAtSpaceSettings();
      const tagInput = await screen.findByTestId('space-settings-tag-input');
      await user.clear(tagInput);
      tagInput.blur();
      await waitFor(() => expect(tagInput).toHaveValue('TST'));
      expect(updateSpy).not.toHaveBeenCalled();
      updateSpy.mockRestore();
    });

    it('should revert to the original value when Escape is pressed', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderAtSpaceSettings();
      const tagInput = await screen.findByTestId('space-settings-tag-input');
      await user.clear(tagInput);
      await user.type(tagInput, 'XYZ{escape}');
      expect(tagInput).toHaveValue('TST');
    });

    it('should commit the tag via Enter (blurs the input)', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderAtSpaceSettings();
      const tagInput = await screen.findByTestId('space-settings-tag-input');
      await user.clear(tagInput);
      await user.type(tagInput, 'ABC{enter}');
      await waitFor(async () => {
        expect((await db.spaces.get('s1'))?.tag).toBe('ABC');
      });
    });

    it('should not write to the DB when blurred with an unchanged tag', async () => {
      await seedBasicSpace();
      const updateSpy = vi.spyOn(db.spaces, 'update');
      renderAtSpaceSettings();
      const tagInput = await screen.findByTestId('space-settings-tag-input');
      tagInput.focus();
      tagInput.blur();
      expect(updateSpy).not.toHaveBeenCalled();
      updateSpy.mockRestore();
    });
  });

  describe('placeholder tabs', () => {
    it('should render the Sharing placeholder (coming soon)', async () => {
      await seedBasicSpace();
      const { container } = renderAtSpaceSettings('/s/s1/settings?tab=sharing');
      const tab = await screen.findByTestId('space-settings-tab-sharing');
      expect(tab).toHaveTextContent(/Visibility/i);
      expect(
        container.querySelector('[data-coming-soon-overlay="true"]'),
      ).not.toBeNull();
    });

    it('should render the Template placeholder (coming soon)', async () => {
      await seedBasicSpace();
      const { container } = renderAtSpaceSettings('/s/s1/settings?tab=template');
      const tab = await screen.findByTestId('space-settings-tab-template');
      expect(tab).toHaveTextContent(/Current template/i);
      expect(
        container.querySelector('[data-coming-soon-overlay="true"]'),
      ).not.toBeNull();
    });

    it('should render the Members placeholder', async () => {
      await seedBasicSpace();
      const { container } = renderAtSpaceSettings('/s/s1/settings?tab=members');
      const tab = await screen.findByTestId('space-settings-tab-members');
      expect(tab).toHaveTextContent(/Invite by email/i);
      expect(
        container.querySelector('[data-coming-soon-overlay="true"]'),
      ).not.toBeNull();
    });
  });

  describe('backups tab', () => {
    it('should render with an empty history hint and a snapshot trigger', async () => {
      await seedBasicSpace();
      renderAtSpaceSettings('/s/s1/settings?tab=backups');
      const tab = await screen.findByTestId('space-settings-tab-backups');
      expect(tab).toHaveTextContent(/No snapshots yet/i);
      const snapshot = screen.getByTestId('space-settings-backups-snapshot');
      expect(snapshot).toHaveTextContent(/snapshot now/i);
    });

    it('should create a snapshot, write a Backups row, and show it in the history', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);
      renderAtSpaceSettings('/s/s1/settings?tab=backups');
      await user.click(
        await screen.findByTestId('space-settings-backups-snapshot'),
      );
      await waitFor(async () => {
        expect(await db.backups.where('scope').equals('s1').count()).toBe(1);
      });
      expect(clickSpy).toHaveBeenCalled();
      const history = await screen.findByTestId('backups-history');
      expect(history).toBeInTheDocument();
      const ids = await db.backups.where('scope').equals('s1').primaryKeys();
      const firstId = ids[0];
      expect(
        screen.getByTestId(`backup-row-${firstId}-delete`),
      ).toHaveTextContent(/delete/i);
      clickSpy.mockRestore();
    });

    it('should format backup sizes across B/kB/MB and timestamps across now/min/h/d/iso ranges', async () => {
      await seedBasicSpace();
      const NOW = Date.UTC(2026, 5, 1, 12, 0, 0);
      vi.setSystemTime(NOW);
      const minuteAgo = NOW - 90 * 1000;
      const hoursAgo = NOW - 3 * 60 * 60 * 1000;
      const daysAgo = NOW - 2 * 24 * 60 * 60 * 1000;
      const oldDate = NOW - 14 * 24 * 60 * 60 * 1000;
      await db.backups.bulkPut([
        {
          id: 'b-bytes',
          when: NOW - 1000,
          scope: 's1',
          kind: 'manual',
          format: 'md-zip',
          size: 512,
          payload: new Blob(['a']),
        },
        {
          id: 'b-kb',
          when: minuteAgo,
          scope: 's1',
          kind: 'manual',
          format: 'md-zip',
          size: 2048,
          payload: new Blob(['ab']),
        },
        {
          id: 'b-mb',
          when: hoursAgo,
          scope: 's1',
          kind: 'manual',
          format: 'md-zip',
          size: 3 * 1024 * 1024,
          payload: new Blob(['abc']),
        },
        {
          id: 'b-days',
          when: daysAgo,
          scope: 's1',
          kind: 'manual',
          format: 'md-zip',
          size: 1024,
          payload: new Blob(['d']),
        },
        {
          id: 'b-old',
          when: oldDate,
          scope: 's1',
          kind: 'manual',
          format: 'md-zip',
          size: 1,
          payload: new Blob(['e']),
        },
      ]);
      renderAtSpaceSettings('/s/s1/settings?tab=backups');
      const history = await screen.findByTestId('backups-history');
      expect(history.textContent).toMatch(/512 B/);
      expect(history.textContent).toMatch(/2\.0 kB/);
      expect(history.textContent).toMatch(/3\.0 MB/);
      expect(history.textContent).toMatch(/min ago|h ago/);
      expect(history.textContent).toMatch(/\d+ d ago/);
      expect(history.textContent).toMatch(/2026-05-/);
      vi.useRealTimers();
    });
  });

  describe('danger zone', () => {
    it('should render the danger tab with the delete trigger', async () => {
      await seedBasicSpace();
      renderAtSpaceSettings('/s/s1/settings?tab=danger');
      expect(
        await screen.findByTestId('space-settings-tab-danger'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('space-settings-danger-delete-trigger'),
      ).toHaveTextContent(/delete this space/i);
    });

    it('should keep the confirm button disabled until the space name is typed exactly', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderAtSpaceSettings('/s/s1/settings?tab=danger');
      await user.click(
        await screen.findByTestId('space-settings-danger-delete-trigger'),
      );
      const input = await screen.findByTestId(
        'space-settings-delete-dialog-input',
      );
      const confirmButton = screen.getByTestId(
        'space-settings-delete-dialog-confirm',
      );
      expect(confirmButton).toBeDisabled();
      await user.type(input, 'Test Spac');
      expect(confirmButton).toBeDisabled();
      await user.type(input, 'e');
      expect(confirmButton).toBeEnabled();
    });

    it('should cancel the delete dialog without deleting the space', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderAtSpaceSettings('/s/s1/settings?tab=danger');
      await user.click(
        await screen.findByTestId('space-settings-danger-delete-trigger'),
      );
      await user.click(
        screen.getByTestId('space-settings-delete-dialog-cancel'),
      );
      expect(await db.spaces.get('s1')).toBeDefined();
    });

    it('should clear the typed confirmation when the dialog is reopened', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderAtSpaceSettings('/s/s1/settings?tab=danger');
      await user.click(
        await screen.findByTestId('space-settings-danger-delete-trigger'),
      );
      const input = await screen.findByTestId(
        'space-settings-delete-dialog-input',
      );
      await user.type(input, 'partial');
      await user.click(
        screen.getByTestId('space-settings-delete-dialog-cancel'),
      );
      await user.click(
        await screen.findByTestId('space-settings-danger-delete-trigger'),
      );
      const reopened = await screen.findByTestId(
        'space-settings-delete-dialog-input',
      );
      expect(reopened).toHaveValue('');
    });

    it('should delete the space and navigate home when confirmed', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderAtSpaceSettings('/s/s1/settings?tab=danger');
      await user.click(
        await screen.findByTestId('space-settings-danger-delete-trigger'),
      );
      const input = await screen.findByTestId(
        'space-settings-delete-dialog-input',
      );
      await user.type(input, 'Test Space');
      await user.click(
        screen.getByTestId('space-settings-delete-dialog-confirm'),
      );
      await waitFor(async () => {
        expect(await db.spaces.get('s1')).toBeUndefined();
      });
      await waitFor(() =>
        expect(screen.getByTestId('catch-all')).toBeInTheDocument(),
      );
    });
  });

  describe('tab switching', () => {
    it('should switch tabs when a tab in the side rail is clicked', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderAtSpaceSettings();
      // SettingsTabs renders both a mobile and a desktop variant in the DOM;
      // either testid resolves to the same logical tab.
      await user.click(
        await screen.findByTestId('settings-tab-mobile-sharing'),
      );
      expect(
        await screen.findByTestId('space-settings-tab-sharing'),
      ).toBeInTheDocument();
    });

    it('should fall back to the General tab when ?tab= is unrecognised', async () => {
      await seedBasicSpace();
      renderAtSpaceSettings('/s/s1/settings?tab=bogus');
      expect(
        await screen.findByTestId('space-settings-tab-general'),
      ).toBeInTheDocument();
    });
  });
});

describe('deleteSpaceCascade', () => {
  it('should delete every row scoped to the space and leave other spaces untouched', async () => {
    await db.spaces.bulkPut([
      sampleSpace,
      { ...sampleSpace, id: 's2', name: 'Other', tag: 'OTH' },
    ]);
    await db.sections.put(sampleSection);
    await db.docs.put(sampleDoc);
    await db.notes.put(sampleNote);
    const annotation: Annotation = {
      id: 'a1',
      docId: 'd1',
      rangeStart: 0,
      rangeEnd: 5,
      kind: 'highlight',
      author: 'tester',
      createdAt: FIXED_TIME,
    };
    const citation: Citation = {
      id: 'c1',
      spaceId: 's1',
      key: 'doe2024',
      authors: 'Doe, J.',
      title: 'On Things',
      year: 2024,
      type: 'article',
      useCount: 0,
    };
    const connection: Connection = {
      id: 'cn1',
      spaceId: 's1',
      fromNoteId: 'n1',
      toNoteId: 'n1',
      createdAt: FIXED_TIME,
    };
    await db.annotations.put(annotation);
    await db.citations.put(citation);
    await db.connections.put(connection);
    await db.palettes.put({
      id: 'p1',
      spaceId: 's1',
      slots: [{ name: 'a', color: '#fff' }],
    });
    const backupS1: Backup = {
      id: 'b1',
      when: FIXED_TIME,
      scope: 's1',
      kind: 'manual',
      format: 'md-zip',
      size: 1,
      payload: new Blob(['x']),
    };
    const backupS2: Backup = {
      ...backupS1,
      id: 'b2',
      scope: 's2',
    };
    await db.backups.bulkPut([backupS1, backupS2]);

    await db.docs.put({
      ...sampleDoc,
      id: 'd-other',
      spaceId: 's2',
      sectionId: 'sec-other',
      name: 'keep me',
    });

    await deleteSpaceCascade('s1');

    expect(await db.spaces.get('s1')).toBeUndefined();
    expect(await db.spaces.get('s2')).toBeDefined();
    expect(await db.docs.where({ spaceId: 's1' }).count()).toBe(0);
    expect(await db.sections.where({ spaceId: 's1' }).count()).toBe(0);
    expect(await db.notes.where({ spaceId: 's1' }).count()).toBe(0);
    expect(await db.citations.where({ spaceId: 's1' }).count()).toBe(0);
    expect(await db.connections.where({ spaceId: 's1' }).count()).toBe(0);
    expect(await db.palettes.where({ spaceId: 's1' }).count()).toBe(0);
    expect(await db.backups.where('scope').equals('s1').count()).toBe(0);
    expect(await db.backups.where('scope').equals('s2').count()).toBe(1);
    expect(await db.annotations.get('a1')).toBeUndefined();
    expect(await db.docs.get('d-other')).toBeDefined();
  });

  it('should no-op cleanly for an empty space with no docs', async () => {
    await db.spaces.put({ ...sampleSpace, id: 's-empty', name: 'Empty' });
    await act(async () => {
      await deleteSpaceCascade('s-empty');
    });
    expect(await db.spaces.get('s-empty')).toBeUndefined();
  });
});
