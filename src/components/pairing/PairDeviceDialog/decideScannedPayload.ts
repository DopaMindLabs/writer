import type { DeviceId } from 'writer-sync/core';
import {
  decodePairingPayload,
  resolvePairingRole,
  type PairingRoleDecision,
} from 'writer-sync/pairing';

/**
 * What a scanned code means for the device that scanned it.
 *
 * The decision is the payload's to make, not the user's: both devices offer and
 * both watch, so which half this device runs is settled by what arrives. The
 * rule itself — including the tie-break when both people scanned — belongs to
 * the protocol package; this only reads the payload well enough to ask it.
 *
 * What is read here is not yet trusted. The kind and the device id decide which
 * path to take; the adapter that follows still validates the payload in full,
 * so a forged id can misdirect this device's next step and nothing more.
 */

/** A payload this device could not read at all, alongside the protocol's verdicts. */
export type ScannedPayloadDecision = PairingRoleDecision | 'unreadable';

export const decideScannedPayload = async (options: {
  /** This device's own identity. */
  deviceId: DeviceId;
  /** The reassembled payload text, as scanned or pasted. */
  payload: string;
}): Promise<ScannedPayloadDecision> => {
  try {
    const decoded = await decodePairingPayload(options.payload);
    return resolvePairingRole({
      deviceId: options.deviceId,
      payloadKind: decoded.kind,
      payloadDeviceId: decoded.deviceId as DeviceId,
    });
  } catch {
    // The reason is for developers: a pairing failure must never put
    // peer-supplied text on screen (threat model §5.11).
    return 'unreadable';
  }
};
