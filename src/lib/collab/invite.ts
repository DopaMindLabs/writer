/**
 * Invite links: the bearer credential that brings a new collaborator to a room.
 * A link carries the **room id, relay URL, a one-time invite secret and the
 * offered role** — and deliberately **never the content key**, which could not be
 * revoked once shared. The invite secret only authorises a *join request* (an
 * HMAC an owner verifies, {@link module:joinRequest}); the owner then admits the
 * member and wraps the content key to their key (Tasks 4, 10).
 *
 * Because the link is a bearer credential at rest — it persists in browser
 * history and whatever channel carried it — the loader must parse it, import to a
 * pending-join state and then **immediately** {@link scrubInviteFragment} so it
 * cannot survive in the address bar, tab history, session restore or profile
 * sync. Invite parameters live in the hash router's query string, so scrubbing
 * preserves the current route and any unrelated query parameters.
 */

/** The roles an invite may offer; owners are never minted by a link. */
export type InviteRole = 'writer' | 'reader';

/** The contents of an invite link. */
export interface InviteLink {
  roomId: string;
  relayUrl: string;
  inviteSecret: Uint8Array;
  role: InviteRole;
}

const PARAM = { room: 'collab', relay: 'relay', invite: 'invite', role: 'role' } as const;
const INVITE_PARAMS: readonly string[] = [PARAM.room, PARAM.relay, PARAM.invite, PARAM.role];

const base64UrlEncode = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const base64UrlDecode = (text: string): Uint8Array =>
  Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

const isInviteRole = (value: string | null): value is InviteRole =>
  value === 'writer' || value === 'reader';

/** Split a hash into its route and query halves (hash-router aware). */
const splitHash = (hash: string): { route: string; query: string } => {
  const raw = hash.replace(/^#/, '');
  const q = raw.indexOf('?');
  if (q >= 0) return { route: raw.slice(0, q), query: raw.slice(q + 1) };
  // No '?': a bare `collab=…` fragment is query-only; anything else is a route.
  return raw.includes('=') ? { route: '', query: raw } : { route: raw, query: '' };
};

/** Encode an invite as a URL fragment (`#/?collab=…&relay=…&invite=…&role=…`). */
export const encodeInvite = (invite: InviteLink): string => {
  const params = new URLSearchParams();
  params.set(PARAM.room, invite.roomId);
  params.set(PARAM.relay, invite.relayUrl);
  params.set(PARAM.invite, base64UrlEncode(invite.inviteSecret));
  params.set(PARAM.role, invite.role);
  return `#/?${params.toString()}`;
};

/** Read an invite from the current location hash, or `null` if none is present. */
export const parseInviteFromLocation = (): InviteLink | null => {
  const { query } = splitHash(window.location.hash);
  const params = new URLSearchParams(query);
  const roomId = params.get(PARAM.room);
  const relayUrl = params.get(PARAM.relay);
  const secret = params.get(PARAM.invite);
  const role = params.get(PARAM.role);
  if (!roomId || !relayUrl || !secret || !isInviteRole(role)) return null;
  return { roomId, relayUrl, inviteSecret: base64UrlDecode(secret), role };
};

/** Strip the invite parameters from the hash, preserving the route and any rest. */
export const scrubInviteFragment = (): void => {
  try {
    const { route, query } = splitHash(window.location.hash);
    const params = new URLSearchParams(query);
    INVITE_PARAMS.forEach((key) => {
      params.delete(key);
    });
    const rest = params.toString();
    const url = new URL(window.location.href);
    url.hash = rest ? `${route}?${rest}` : route;
    window.history.replaceState(null, '', url.toString());
  } catch {
    /* history unavailable — the fragment stays; the bearer-credential risk is documented */
  }
};
