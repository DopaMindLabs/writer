import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import dexieCloud from 'dexie-cloud-addon';
import { buildDb } from '@/db/buildDb';
import { LoremDB } from '@/db/LoremDB';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import { InvariantError } from '@/lib/invariant';
import { asDeviceId, asOperationId, asPrincipalId } from 'writer-sync/core';
import type { SyncKeyRing } from 'writer-sync/crypto';
import { makePutFrame } from '@/lib/writerSyncIntegration/materialization/writerOperationFactory';
import type { EncryptedSyncFrame } from 'writer-sync/operations';
import { sampleMetadata } from '@/test/fixtures';
import { DEXIE_CLOUD_PROVIDER_ID } from './dexieCloudProviderId';
import type { DexieRow } from './dexieRow';
import {
  createSpaceRealm,
  dropSpaceRealm,
  restampScopeFrames,
} from './spaceRealm';

/**
 * These run against a plain (non-cloud) database on purpose. With no addon there
 * is no access-control middleware stamping rows behind the test, so assertions
 * see exactly what the stamping wrote; a cloud instance would also spend the
 * whole run failing to reach its sync endpoint.
 *
 * A plain database reports no current user, which is the state
 * {@link createSpaceRealm} must refuse: minting a realm then produces one whose
 * id *is* the private realm, because the addon stamps `realmId` on every written
 * row and the `realms` table is keyed on `realmId`.
 *
 * Since the frame cutover, a realm binds the scope's **operation frames** —
 * materialised content rows are local projections that never leave the device —
 * so the fan-out these tests exercise is over `syncOperations`.
 */
let db: LoremDB;
let ring: SyncKeyRing;

const DEVICE = asDeviceId('device-a');

/** A space with one enqueued frame per scope, plus a local-only row. */
const seedSpace = async (): Promise<void> => {
  await db.spaces.put({
    ...sampleMetadata(),
    id: 's1', tag: 'TST', name: 'Space', shared: false, template: 'blank',
    createdAt: 1, updatedAt: 1,
  });
  await enqueueFrame({ scopeId: 's1', entityId: 'n1' });
  await enqueueFrame({ scopeId: 's1', entityId: 'n2' });
  // A different scope's operation: it must never be caught by the fan-out.
  await enqueueFrame({ scopeId: 's2', entityId: 'n3' });
  // Local-only: never leaves the device, so it must never carry a realm.
  await db.syncConfigs.put({ spaceId: 's1', intervalMin: 30 });
};

const enqueueFrame = async (options: {
  scopeId: string;
  entityId: string;
}): Promise<void> => {
  await db.syncOperations.put(
    await makePutFrame({
      ring,
      deviceId: DEVICE,
      entityTable: 'notes',
      row: {
        ...sampleMetadata(options.scopeId),
        mutationId: asOperationId(`op-${options.entityId}`),
        createdBy: asPrincipalId('me'),
        updatedBy: asPrincipalId('me'),
        id: options.entityId,
      },
    }),
  );
};

/** The realm stamped on each frame, keyed by operation id. */
const stampedRealms = async (): Promise<Record<string, string | undefined>> => {
  const frames = await db
    .table<DexieRow<EncryptedSyncFrame>>('syncOperations')
    .toArray();
  return Object.fromEntries(
    frames.map((frame) => [String(frame.operationId), frame.realmId]),
  );
};

const bindingFor = (scopeId: string) =>
  db.syncProviderBindings.get([scopeId, DEXIE_CLOUD_PROVIDER_ID]);

beforeEach(async () => {
  ring = await deriveKeyRing(generateRootSecret(), 1);
  db = buildDb(`realm-${String(Math.random()).slice(2)}`);
  await db.open();
  await seedSpace();
});

afterEach(async () => {
  await db.delete();
});

describe('restampScopeFrames', () => {
  it('stamps every frame of the scope and nothing else', async () => {
    expect(
      await restampScopeFrames({ db, accessScopeId: 's1', realmId: 'rlm-shared' }),
    ).toBe(2);

    expect(await stampedRealms()).toEqual({
      'op-n1': 'rlm-shared',
      'op-n2': 'rlm-shared',
      // Another scope's operation stays where it was.
      'op-n3': undefined,
    });
  });

  it('leaves the ciphertext payload untouched — a realm is routing, not content', async () => {
    const before = await db.syncOperations.get('op-n1');
    await restampScopeFrames({ db, accessScopeId: 's1', realmId: 'rlm-shared' });

    const after = await db.syncOperations.get('op-n1');
    expect(after?.payload).toBe(before?.payload);
    expect(after?.payloadHash).toBe(before?.payloadHash);
    expect(after?.accessScopeId).toBe('s1');
  });

  it('never stamps a local-only row — those never reach the server', async () => {
    await restampScopeFrames({ db, accessScopeId: 's1', realmId: 'rlm-shared' });

    expect(await db.syncConfigs.get('s1')).not.toHaveProperty('realmId');
  });

  it('copes with a scope that has no enqueued operations', async () => {
    expect(
      await restampScopeFrames({ db, accessScopeId: 'empty', realmId: 'rlm-shared' }),
    ).toBe(0);
  });
});

describe('createSpaceRealm', () => {
  it('refuses while signed out, rather than minting a realm that grants nobody access', async () => {
    await expect(createSpaceRealm('s1', db)).rejects.toThrow(InvariantError);

    expect(await bindingFor('s1')).toBeUndefined();
  });

  it('refuses an unknown space', async () => {
    await expect(createSpaceRealm('nope', db)).rejects.toThrow(InvariantError);
  });
});

describe('dropSpaceRealm', () => {
  it("is a no-op on a scope in its owner's private realm", async () => {
    await expect(dropSpaceRealm('s1', db)).resolves.toBeUndefined();

    expect(await stampedRealms()).toEqual({
      'op-n1': undefined,
      'op-n2': undefined,
      'op-n3': undefined,
    });
  });

  it('is a no-op on an unknown scope', async () => {
    await expect(dropSpaceRealm('nope', db)).resolves.toBeUndefined();
  });
});

/**
 * The share/unshare flows need the addon's access-control tables (`realms`,
 * `members`), which a plain database lacks, so these run on a cloud-schema
 * instance. It is never `configure()`d — no endpoint, no sync — and the addon
 * reports `'unauthorized'` until a user signs in, which the sign-in-dependent
 * case fakes through the addon's public `currentUserId`.
 */
describe('share and unshare against the cloud schema', () => {
  beforeEach(async () => {
    await db.delete();
    db = new LoremDB(`realm-cloud-${String(Math.random()).slice(2)}`, {
      addons: [dexieCloud],
      cloud: true,
    });
    await db.open();
    await seedSpace();
  });

  /** Report `user-a` from the addon's public `currentUserId`, as login does. */
  const signIn = (): void => {
    vi.spyOn(db.cloud, 'currentUserId', 'get').mockReturnValue('user-a');
  };

  it('mints a realm, files the scope’s frames into it and records the binding', async () => {
    signIn();

    const realmId = await createSpaceRealm('s1', db);

    expect(await stampedRealms()).toMatchObject({
      'op-n1': realmId,
      'op-n2': realmId,
    });
    expect(await db.realms.get(realmId)).toMatchObject({ name: 'Space' });
    // The binding is what later frames inherit: the provider resolves a scope
    // through it rather than re-reading a content row. (Matched loosely: this
    // harness leaves the addon unconfigured, so it stamps its own realm/owner
    // onto the row — in the app the table is local-only and it cannot.)
    expect(await bindingFor('s1')).toMatchObject({
      scopeId: 's1',
      providerInstanceId: DEXIE_CLOUD_PROVIDER_ID,
      externalScopeId: realmId,
      enabled: true,
    });
  });

  it('refuses a scope that is already bound to a realm', async () => {
    signIn();
    await createSpaceRealm('s1', db);

    await expect(createSpaceRealm('s1', db)).rejects.toThrow(InvariantError);
  });

  it('returns the frames to the private realm, dropping realm, members and binding', async () => {
    signIn();
    const realmId = await createSpaceRealm('s1', db);
    await db.members.add({ realmId, email: 'a@b.c' });

    await dropSpaceRealm('s1', db);

    expect(await stampedRealms()).toMatchObject({
      'op-n1': 'user-a',
      'op-n2': 'user-a',
    });
    expect(await db.realms.get(realmId)).toBeUndefined();
    expect(await db.members.where({ realmId }).count()).toBe(0);
    expect(await bindingFor('s1')).toBeUndefined();
  });
});
