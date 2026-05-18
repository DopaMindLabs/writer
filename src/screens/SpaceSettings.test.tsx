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
import {
  deleteSpaceCascade,
  SpaceSettingsScreen,
} from './SpaceSettings';

function renderAtSpaceSettings(initialPath = '/s/s1/settings') {
  return renderAtRoute(<SpaceSettingsScreen />, {
    path: '/s/:spaceId/settings',
    initialEntries: [initialPath],
  });
}

describe('SpaceSettingsScreen', () => {
  it('renders the General tab with the space name and tag by default', async () => {
    await seedBasicSpace();
    renderAtSpaceSettings();
    expect(
      await screen.findByRole('heading', { name: /^general$/i }),
    ).toBeInTheDocument();
    expect(
      (screen.getByLabelText(/space name/i) as HTMLInputElement).value,
    ).toBe('Test Space');
    expect(
      (screen.getByLabelText(/^tag$/i) as HTMLInputElement).value,
    ).toBe('TST');
  });

  it('shows a loading placeholder when the space has not loaded yet', async () => {
    renderAtSpaceSettings('/s/nope/settings');
    expect(
      await screen.findByTestId('space-settings-loading'),
    ).toBeInTheDocument();
  });

  it('persists a rename via Enter on the name input', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderAtSpaceSettings();
    const nameInput = (await screen.findByLabelText(
      /space name/i,
    )) as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, 'Renamed Space{enter}');
    await waitFor(async () => {
      expect((await db.spaces.get('s1'))?.name).toBe('Renamed Space');
    });
  });

  it('reverts an unchanged or empty name without writing to Dexie', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(db.spaces, 'update');
    renderAtSpaceSettings();
    const nameInput = (await screen.findByLabelText(
      /space name/i,
    )) as HTMLInputElement;
    await user.clear(nameInput);
    nameInput.blur();
    await waitFor(() => expect(nameInput.value).toBe('Test Space'));
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

  it('Escape on the name input reverts to the original value', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderAtSpaceSettings();
    const nameInput = (await screen.findByLabelText(
      /space name/i,
    )) as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, 'Throwaway{escape}');
    expect(nameInput.value).toBe('Test Space');
  });

  it('persists a tag change via blur', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderAtSpaceSettings();
    const tagInput = (await screen.findByLabelText(
      /^tag$/i,
    )) as HTMLInputElement;
    await user.clear(tagInput);
    await user.type(tagInput, 'NEW');
    tagInput.blur();
    await waitFor(async () => {
      expect((await db.spaces.get('s1'))?.tag).toBe('NEW');
    });
  });

  it('reverts an empty tag without writing', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(db.spaces, 'update');
    renderAtSpaceSettings();
    const tagInput = (await screen.findByLabelText(
      /^tag$/i,
    )) as HTMLInputElement;
    await user.clear(tagInput);
    tagInput.blur();
    await waitFor(() => expect(tagInput.value).toBe('TST'));
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

  it('Escape on the tag input reverts to the original value', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderAtSpaceSettings();
    const tagInput = (await screen.findByLabelText(
      /^tag$/i,
    )) as HTMLInputElement;
    await user.clear(tagInput);
    await user.type(tagInput, 'XYZ{escape}');
    expect(tagInput.value).toBe('TST');
  });

  it('Enter on the tag input commits the rename via blur', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderAtSpaceSettings();
    const tagInput = (await screen.findByLabelText(
      /^tag$/i,
    )) as HTMLInputElement;
    await user.clear(tagInput);
    await user.type(tagInput, 'ABC{enter}');
    await waitFor(async () => {
      expect((await db.spaces.get('s1'))?.tag).toBe('ABC');
    });
  });

  it('blurring with an unchanged tag does not write to the DB', async () => {
    await seedBasicSpace();
    const updateSpy = vi.spyOn(db.spaces, 'update');
    renderAtSpaceSettings();
    const tagInput = (await screen.findByLabelText(
      /^tag$/i,
    )) as HTMLInputElement;
    // The tag is already 'TST' from sampleSpace; blurring without changes
    // should be a no-op.
    tagInput.focus();
    tagInput.blur();
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

  it('blurring with an unchanged name does not write to the DB', async () => {
    await seedBasicSpace();
    const updateSpy = vi.spyOn(db.spaces, 'update');
    renderAtSpaceSettings();
    const nameInput = (await screen.findByLabelText(
      /space name/i,
    )) as HTMLInputElement;
    nameInput.focus();
    nameInput.blur();
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

  it('renders the Sharing placeholder (coming soon)', async () => {
    await seedBasicSpace();
    const { container } = renderAtSpaceSettings('/s/s1/settings?tab=sharing');
    expect(
      await screen.findByRole('heading', { name: /^sharing$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Visibility/i)).toBeInTheDocument();
    expect(
      container.querySelector('[data-coming-soon-overlay="true"]'),
    ).not.toBeNull();
  });

  it('renders the world rail with the current space as the back affordance', async () => {
    await seedBasicSpace();
    renderAtSpaceSettings();
    const spaceLink = await screen.findByRole('link', { name: 'TST' });
    expect(spaceLink).toHaveAttribute('href', '/s/s1');
  });

  it('renders the Template placeholder (coming soon)', async () => {
    await seedBasicSpace();
    const { container } = renderAtSpaceSettings('/s/s1/settings?tab=template');
    expect(
      await screen.findByRole('heading', { name: /^template$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Current template/i)).toBeInTheDocument();
    expect(
      container.querySelector('[data-coming-soon-overlay="true"]'),
    ).not.toBeNull();
  });

  it('renders the Members placeholder', async () => {
    await seedBasicSpace();
    const { container } = renderAtSpaceSettings('/s/s1/settings?tab=members');
    expect(
      await screen.findByRole('heading', { name: /^members$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Invite by email/i)).toBeInTheDocument();
    expect(
      container.querySelector('[data-coming-soon-overlay="true"]'),
    ).not.toBeNull();
  });

  it('renders the Backups tab with an empty history hint', async () => {
    await seedBasicSpace();
    renderAtSpaceSettings('/s/s1/settings?tab=backups');
    expect(
      await screen.findByRole('heading', { name: /^backups$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No snapshots yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /snapshot now/i }),
    ).toBeInTheDocument();
  });

  it('creates a snapshot, writes a Backups row, and shows it in the history', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    renderAtSpaceSettings('/s/s1/settings?tab=backups');
    await user.click(
      await screen.findByRole('button', { name: /snapshot now/i }),
    );
    await waitFor(async () => {
      expect(await db.backups.where('scope').equals('s1').count()).toBe(1);
    });
    expect(clickSpy).toHaveBeenCalled();
    expect(await screen.findByTestId('backups-history')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    clickSpy.mockRestore();
  });

  it('formats backup sizes across B/kB/MB and timestamps across now/min/h/d/iso ranges', async () => {
    await seedBasicSpace();
    const NOW = Date.UTC(2026, 5, 1, 12, 0, 0);
    vi.setSystemTime(NOW);
    const minuteAgo = NOW - 90 * 1000; // ~1 min ago
    const hoursAgo = NOW - 3 * 60 * 60 * 1000; // 3 h ago
    const daysAgo = NOW - 2 * 24 * 60 * 60 * 1000; // 2 d ago
    const oldDate = NOW - 14 * 24 * 60 * 60 * 1000; // 14 d -> ISO
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
    // 14d → ISO date YYYY-MM-DD; verify a 2026-05- prefix appears.
    expect(history.textContent).toMatch(/2026-05-/);
    vi.useRealTimers();
  });

  it('renders the Danger zone with the delete trigger', async () => {
    await seedBasicSpace();
    renderAtSpaceSettings('/s/s1/settings?tab=danger');
    expect(
      await screen.findByRole('heading', { name: /^danger zone$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /delete this space/i }),
    ).toBeInTheDocument();
  });

  it('keeps the delete dialog confirm button disabled until the space name is typed exactly', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderAtSpaceSettings('/s/s1/settings?tab=danger');
    await user.click(
      await screen.findByRole('button', { name: /delete this space/i }),
    );
    const input = await screen.findByLabelText(/type test space to confirm/i);
    const confirmButton = screen.getByRole('button', {
      name: /^delete space$/i,
    });
    expect(confirmButton).toBeDisabled();
    await user.type(input, 'Test Spac');
    expect(confirmButton).toBeDisabled();
    await user.type(input, 'e');
    expect(confirmButton).toBeEnabled();
  });

  it('cancels the delete dialog without deleting the space', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderAtSpaceSettings('/s/s1/settings?tab=danger');
    await user.click(
      await screen.findByRole('button', { name: /delete this space/i }),
    );
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(await db.spaces.get('s1')).toBeDefined();
  });

  it('clears the typed confirmation when the dialog is reopened', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderAtSpaceSettings('/s/s1/settings?tab=danger');
    await user.click(
      await screen.findByRole('button', { name: /delete this space/i }),
    );
    const input = (await screen.findByLabelText(
      /type test space to confirm/i,
    )) as HTMLInputElement;
    await user.type(input, 'partial');
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    await user.click(
      await screen.findByRole('button', { name: /delete this space/i }),
    );
    const reopened = (await screen.findByLabelText(
      /type test space to confirm/i,
    )) as HTMLInputElement;
    expect(reopened.value).toBe('');
  });

  it('deletes the space and navigates home when confirmed', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderAtSpaceSettings('/s/s1/settings?tab=danger');
    await user.click(
      await screen.findByRole('button', { name: /delete this space/i }),
    );
    const input = await screen.findByLabelText(/type test space to confirm/i);
    await user.type(input, 'Test Space');
    await user.click(screen.getByRole('button', { name: /^delete space$/i }));
    await waitFor(async () => {
      expect(await db.spaces.get('s1')).toBeUndefined();
    });
    await waitFor(() =>
      expect(screen.getByTestId('catch-all')).toBeInTheDocument(),
    );
  });

  it('switches tabs when a tab in the side rail is clicked', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderAtSpaceSettings();
    // SettingsTabs renders both a mobile and a desktop variant in the DOM, so
    // there are two "Sharing" buttons; click either.
    const buttons = await screen.findAllByRole('button', {
      name: /^sharing$/i,
    });
    await user.click(buttons[0]);
    expect(
      await screen.findByRole('heading', { name: /^sharing$/i }),
    ).toBeInTheDocument();
  });

  it('falls back to the General tab when ?tab= is unrecognised', async () => {
    await seedBasicSpace();
    renderAtSpaceSettings('/s/s1/settings?tab=bogus');
    expect(
      await screen.findByRole('heading', { name: /^general$/i }),
    ).toBeInTheDocument();
  });
});

describe('deleteSpaceCascade', () => {
  it('deletes every row scoped to the space and leaves other spaces untouched', async () => {
    // Seed s1 with a doc, annotation, note, section, citation, connection
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

    // Seed an unrelated doc in s2 to confirm it survives
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

  it('no-ops cleanly for an empty space with no docs', async () => {
    await db.spaces.put({ ...sampleSpace, id: 's-empty', name: 'Empty' });
    await act(async () => {
      await deleteSpaceCascade('s-empty');
    });
    expect(await db.spaces.get('s-empty')).toBeUndefined();
  });
});
