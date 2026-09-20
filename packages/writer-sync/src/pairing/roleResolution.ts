import type { DeviceId } from '../core/ids';
import type { PairingPayloadKind } from './pairing.types';

/**
 * Who answers whom, decided from the payload in hand rather than from a question
 * put to the user.
 *
 * Asking a user to choose between "show a code" and "read a code" asks them to
 * understand the protocol before they can start, and both options read as
 * equally plausible from either device. So neither device chooses: both offer,
 * and the device that reads a code is the one that answers it.
 *
 * **Reading is the act that decides.** An earlier rule broke the both-scanned
 * race by comparing device ids and letting only the greater one answer. That is
 * sound for two devices watching a channel and wrong for two watching a camera:
 * a code arrives only when a human points one device at another, and in the
 * ordinary flow exactly one of them ever does. A device that refused to answer
 * because its id sorted lower left that user waiting on a reply nobody was
 * preparing — on roughly half of all pairings, with nothing on screen to
 * distinguish it from a slow one.
 *
 * The race the old rule guarded against now resolves visibly instead: if someone
 * scans on both devices, each holds a reply the other can no longer accept, and
 * the next scan fails and says to start again. A failure the user can see and
 * recover from beats a hang they cannot explain.
 *
 * A device pointed at its own screen is the one payload that settles nothing:
 * answering a description it authored itself would pair a device with itself.
 */

export type PairingRoleDecision =
  /** This device answers the offer it just took: it becomes the joiner. */
  | 'answer-offer'
  /** This device authored the offer being replied to: it accepts the answer. */
  | 'accept-answer'
  /** This device read its own code, which asks nothing of it. */
  | 'own-code';

export const resolvePairingRole = (options: {
  /** This device's own identity. */
  deviceId: DeviceId;
  /** What arrived: an opening offer, or a reply to this device's own. */
  payloadKind: PairingPayloadKind;
  /** The device that authored the payload. */
  payloadDeviceId: DeviceId;
}): PairingRoleDecision => {
  if (String(options.deviceId) === String(options.payloadDeviceId)) return 'own-code';
  return options.payloadKind === 'answer' ? 'accept-answer' : 'answer-offer';
};
