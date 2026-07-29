/**
 * A tiny synchronous signal that forces the device list open, with a chosen row
 * standing in as "this device".
 *
 * The real list needs a completed sign-in — an account, a minted client identity,
 * a settled pull — none of which a headless run can reach, since no OTP ever
 * arrives. Forcing the surface lets the list, its badges and the revoke flow be
 * driven in e2e against the same components production renders.
 *
 * Mirrors {@link import('./deviceLimit').deviceLimitState} in shape and is kept out
 * of any React store so it can be read without a hook.
 */
export interface DevicePreview {
  /** The id to treat as this device, so "This device" and Sign out have a row. */
  ownId: string;
}

/** The seeded row that stands in as "this device" under the preview. */
export const PREVIEW_OWN_ID = 'preview-this-device';

let preview: DevicePreview | null = null;
const listeners = new Set<() => void>();

export const devicePreviewState = {
  /** Synchronous read for the panel's render flags and the list's own-row match. */
  current: (): DevicePreview | null => preview,
  /** Force the list open (or clear it) and notify subscribers. */
  set: (value: DevicePreview | null): void => {
    if (value === preview) return;
    preview = value;
    for (const listener of listeners) listener();
  },
  /** Subscribe to changes (for `useSyncExternalStore`); returns an unsubscribe. */
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
