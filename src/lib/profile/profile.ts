import { db } from '@/db/db';
import { newId } from '@/lib/ids';

/**
 * The five presence hue keys a profile can hold. They match the `--presence-*`
 * design-system tokens and render via the `presence-*` Tailwind colours.
 */
export const PRESENCE_HUES = [
  'presence-1',
  'presence-2',
  'presence-3',
  'presence-4',
  'presence-5',
] as const;
export type PresenceHue = (typeof PRESENCE_HUES)[number];

/**
 * The local author profile, stored only in this browser's IndexedDB.
 * `authorId` is the stable attribution key; `displayName` and `presenceHue`
 * are user-editable.
 *
 * `authorId` is the *principal* — a person's attribution identity (see
 * `PrincipalId` in `writer-sync/core`, converted at the writerSync
 * facade). It must never double as a device identity: a `DeviceId` is a
 * separate, cryptographic identity introduced by the pairing layer.
 */
export interface Profile {
  authorId: string;
  displayName: string;
  presenceHue: PresenceHue;
}

const PROFILE_KEY = 'profile';

const hueFromId = (authorId: string): PresenceHue => {
  const sum = Array.from(authorId).reduce(
    (acc, ch) => acc + ch.charCodeAt(0),
    0,
  );
  return PRESENCE_HUES[sum % PRESENCE_HUES.length];
};

export const defaultProfile = (): Profile => {
  const authorId = newId();
  return { authorId, displayName: '', presenceHue: hueFromId(authorId) };
};

const isPresenceHue = (value: unknown): value is PresenceHue =>
  typeof value === 'string' &&
  (PRESENCE_HUES as readonly string[]).includes(value);

/**
 * Coerces an untrusted stored value into a valid Profile, repairing any field
 * that fails validation. Reports whether repair happened so callers can rewrite
 * the healed value back to storage.
 */
export const parseProfile = (
  value: unknown,
): { profile: Profile; repaired: boolean } => {
  const record =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  let repaired = false;

  let authorId = record.authorId;
  if (typeof authorId !== 'string' || authorId.length === 0) {
    authorId = newId();
    repaired = true;
  }

  let displayName = record.displayName;
  if (typeof displayName !== 'string') {
    displayName = '';
    repaired = true;
  }

  let presenceHue = record.presenceHue;
  if (!isPresenceHue(presenceHue)) {
    presenceHue = hueFromId(authorId as string);
    repaired = true;
  }

  return {
    profile: {
      authorId: authorId as string,
      displayName: displayName as string,
      presenceHue: presenceHue as PresenceHue,
    },
    repaired,
  };
};

export const getProfile = async (): Promise<Profile> => {
  const row = await db.meta.get(PROFILE_KEY);
  if (!row) {
    const fresh = defaultProfile();
    await db.meta.put({ key: PROFILE_KEY, value: fresh });
    return fresh;
  }
  const { profile, repaired } = parseProfile(row.value);
  if (repaired) await db.meta.put({ key: PROFILE_KEY, value: profile });
  return profile;
};

export const updateProfile = async (
  patch: Partial<Omit<Profile, 'authorId'>>,
): Promise<void> => {
  // Read and write in one transaction so overlapping edits (e.g. a name change
  // and a hue click) serialize instead of each overwriting the other's field.
  await db.transaction('rw', db.meta, async () => {
    const current = await getProfile();
    const next: Profile = {
      authorId: current.authorId,
      displayName: patch.displayName ?? current.displayName,
      presenceHue: patch.presenceHue ?? current.presenceHue,
    };
    await db.meta.put({ key: PROFILE_KEY, value: next });
  });
};
