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
    renderAtSpaceSettings('/s/s1/settings?tab=sharing');
    expect(
      await screen.findByRole('heading', { name: /^sharing$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Per-space visibility and shared links/i),
    ).toBeInTheDocument();
  });

  it('renders a Back link that returns to the current space', async () => {
    await seedBasicSpace();
    renderAtSpaceSettings();
    const back = await screen.findByRole('link', { name: /back/i });
    expect(back).toHaveAttribute('href', '/s/s1');
  });

  it('renders the Template placeholder (coming soon)', async () => {
    await seedBasicSpace();
    renderAtSpaceSettings('/s/s1/settings?tab=template');
    expect(
      await screen.findByRole('heading', { name: /^template$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Changing a space's template after creation/i),
    ).toBeInTheDocument();
  });

  it('renders the Members placeholder', async () => {
    await seedBasicSpace();
    renderAtSpaceSettings('/s/s1/settings?tab=members');
    expect(
      await screen.findByRole('heading', { name: /^members$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Invite collaborators/i),
    ).toBeInTheDocument();
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
    await user.click(
      await screen.findByRole('button', { name: /^sharing$/i }),
    );
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
