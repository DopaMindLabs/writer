import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildDb } from '@/db/buildDb';
import type { LoremDB } from '@/db/LoremDB';
import { CLOUD_FLAG_KEY } from '@/lib/cloud/flag';
import { invariant, InvariantError } from '@/lib/invariant';
import { ScopeRole } from '@/lib/syncProviders/types';
import {
  addSpaceMember,
  listSpaceMembers,
  removeSpaceMember,
  setSpaceMemberRole,
} from './realmMembers';

/**
 * Members live only on a cloud-enabled database — the addon injects the table —
 * so unlike the realm stamping these run against one. The fixture is hermetic:
 * fetch and WebSocket are stubbed before construction so the addon's sync loop
 * never reaches the network, and the console spies assert it stays quiet.
 */
let db: LoremDB;
let consoleError: ReturnType<typeof vi.spyOn>;
let consoleWarn: ReturnType<typeof vi.spyOn>;

const SHARED_REALM = 'rlm-shared';

const seedSpaces = async (): Promise<void> => {
  await db.spaces.bulkPut([
    {
      id: 'shared', tag: 'SHR', name: 'Shared', shared: false, template: 'blank',
      createdAt: 1, updatedAt: 1, realmId: SHARED_REALM,
    },
    {
      id: 'private', tag: 'PRV', name: 'Private', shared: false, template: 'blank',
      createdAt: 1, updatedAt: 1,
    },
  ]);
};

/**
 * The smallest server reply the addon's initial sync accepts (the fields
 * `applySyncResponse` reads). Serving it from the fetch stub lets the initial
 * sync complete silently instead of error-logging against a dead endpoint —
 * the addon performs that sync unconditionally on first open, so a rejecting
 * stub would fail every test's console-silence assertion.
 */
const SYNC_RESPONSE = {
  serverRevision: 1,
  dbId: 'dbid-test',
  realms: [],
  inviteRealms: [],
  schema: {},
  changes: [],
  yMessages: [],
};

beforeEach(async () => {
  // Keep the cloud instance hermetic and deterministic: stub the network
  // before the addon can touch it (cf. buildDb.test.ts).
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    new Response(JSON.stringify(SYNC_RESPONSE), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
  vi.stubGlobal(
    'WebSocket',
    class {
      close() {}
      addEventListener() {}
      removeEventListener() {}
      send() {}
    },
  );
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubEnv('VITE_DEXIE_CLOUD_URL', 'https://spike.dexie.cloud');
  localStorage.setItem(CLOUD_FLAG_KEY, 'on');
  db = buildDb(`members-${String(Math.random()).slice(2)}`);
  // Membership operations are local row writes — the sync machinery is
  // irrelevant here, so switch off everything optional (the initial sync is
  // unconditional; the fetch stub answers it). `blobMode: 'lazy'` stops the
  // eager blob sweep, whose post-sync timer would otherwise fire after the
  // test closed the database and error-log once per synced table. The addon
  // reads these options when the db opens.
  invariant(db.cloud.options, 'cloud instance expected');
  db.cloud.options.disableEagerSync = true;
  db.cloud.options.disableWebSocket = true;
  db.cloud.options.blobMode = 'lazy';
  await seedSpaces();
});

afterEach(async () => {
  // Close before deleting: an open cloud database keeps a sync loop running,
  // and its failed attempts would log for the rest of the run.
  db.close();
  await db.delete();
  // The suite's contract is silence: membership operations are local row
  // writes and must not produce sync noise.
  expect(consoleError).not.toHaveBeenCalled();
  expect(consoleWarn).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe('addSpaceMember', () => {
  it('records a grant on the space realm as an invitation', async () => {
    const id = await addSpaceMember({
      spaceId: 'shared', email: 'writer@example.com', role: ScopeRole.Editor, db,
    });

    const row = await db.members.get(id);
    expect(row?.realmId).toBe(SHARED_REALM);
    expect(row?.email).toBe('writer@example.com');
    expect(row?.roles).toEqual([ScopeRole.Editor]);
    // `invite` is what turns the row into an invitation the recipient can accept.
    expect(row?.invite).toBe(true);
  });

  it('mints the id through the addon, so the server will accept it', async () => {
    const id = await addSpaceMember({
      spaceId: 'shared', email: 'writer@example.com', role: ScopeRole.Editor, db,
    });

    expect(id.startsWith(db.members.idPrefix())).toBe(true);
  });

  it('refuses a space that is not shared — there is no realm to grant access to', async () => {
    await expect(
      addSpaceMember({
        spaceId: 'private', email: 'writer@example.com', role: ScopeRole.Editor, db,
      }),
    ).rejects.toThrow(InvariantError);

    expect(await db.members.count()).toBe(0);
  });

  it('refuses a second grant to the same address', async () => {
    await addSpaceMember({
      spaceId: 'shared', email: 'writer@example.com', role: ScopeRole.Editor, db,
    });

    await expect(
      addSpaceMember({
        spaceId: 'shared', email: 'writer@example.com', role: ScopeRole.Viewer, db,
      }),
    ).rejects.toThrow(InvariantError);

    expect(await db.members.count()).toBe(1);
  });

  it('refuses an unknown space', async () => {
    await expect(
      addSpaceMember({ spaceId: 'nope', email: 'a@b.c', role: ScopeRole.Editor, db }),
    ).rejects.toThrow(InvariantError);
  });
});

describe('listSpaceMembers', () => {
  it('lists the grants on this space and no others', async () => {
    await addSpaceMember({
      spaceId: 'shared', email: 'one@example.com', role: ScopeRole.Editor, db,
    });
    await db.members.add({
      id: db.members.newId(), realmId: 'rlm-elsewhere', email: 'two@example.com',
      roles: [ScopeRole.Editor],
    });

    const members = await listSpaceMembers('shared', db);

    expect(members.map((member) => member.email)).toEqual(['one@example.com']);
  });

  it('reads a member with no recorded role as a viewer, the least a grant can mean', async () => {
    await db.members.add({
      id: db.members.newId(), realmId: SHARED_REALM, email: 'bare@example.com',
    });

    const [member] = await listSpaceMembers('shared', db);

    expect(member.role).toBe(ScopeRole.Viewer);
  });

  it('is empty for a shared space nobody has joined', async () => {
    expect(await listSpaceMembers('shared', db)).toEqual([]);
  });

  it('reads a role name outside the contract as a viewer — synced state is untrusted', async () => {
    await db.members.add({
      id: db.members.newId(), realmId: SHARED_REALM, email: 'legacy@example.com',
      roles: ['manager'],
    });

    const [member] = await listSpaceMembers('shared', db);

    expect(member.role).toBe(ScopeRole.Viewer);
  });

  it('reads several recognised roles as the least privileged of them', async () => {
    await db.members.add({
      id: db.members.newId(), realmId: SHARED_REALM, email: 'both@example.com',
      roles: [ScopeRole.Owner, ScopeRole.Editor],
    });

    const [member] = await listSpaceMembers('shared', db);

    expect(member.role).toBe(ScopeRole.Editor);
  });

  it('ignores unrecognised names alongside a recognised role', async () => {
    await db.members.add({
      id: db.members.newId(), realmId: SHARED_REALM, email: 'mixed@example.com',
      roles: ['manager', ScopeRole.Owner],
    });

    const [member] = await listSpaceMembers('shared', db);

    expect(member.role).toBe(ScopeRole.Owner);
  });
});

describe('removeSpaceMember', () => {
  it('revokes the grant by deleting the row', async () => {
    const id = await addSpaceMember({
      spaceId: 'shared', email: 'writer@example.com', role: ScopeRole.Editor, db,
    });

    await removeSpaceMember('shared', id, db);

    expect(await db.members.get(id)).toBeUndefined();
  });

  it("refuses a member of another space's realm", async () => {
    const foreign = db.members.newId();
    await db.members.add({
      id: foreign, realmId: 'rlm-elsewhere', email: 'two@example.com',
    });

    await expect(removeSpaceMember('shared', foreign, db)).rejects.toThrow(InvariantError);

    expect(await db.members.get(foreign)).toBeDefined();
  });

  it('refuses an unknown member', async () => {
    await expect(removeSpaceMember('shared', 'mmb-nope', db)).rejects.toThrow(InvariantError);
  });
});

describe('setSpaceMemberRole', () => {
  it('changes what a member may do, leaving the rest of the row intact', async () => {
    const id = await addSpaceMember({
      spaceId: 'shared', email: 'writer@example.com', role: ScopeRole.Editor, db,
    });

    await setSpaceMemberRole({ spaceId: 'shared', memberId: id, role: ScopeRole.Viewer, db });

    const row = await db.members.get(id);
    expect(row?.roles).toEqual([ScopeRole.Viewer]);
    expect(row?.email).toBe('writer@example.com');
    expect(row?.invite).toBe(true);
  });

  it("refuses a member of another space's realm", async () => {
    const foreign = db.members.newId();
    await db.members.add({
      id: foreign, realmId: 'rlm-elsewhere', email: 'two@example.com',
      roles: [ScopeRole.Viewer],
    });

    await expect(
      setSpaceMemberRole({ spaceId: 'shared', memberId: foreign, role: ScopeRole.Editor, db }),
    ).rejects.toThrow(InvariantError);

    expect((await db.members.get(foreign))?.roles).toEqual([ScopeRole.Viewer]);
  });
});
