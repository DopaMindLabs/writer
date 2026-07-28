import type { DeviceId } from '../core/ids';
import type { PairingPayloadKind } from './pairing.types';

/**
 * Who answers whom, decided from the payload in hand rather than from a question
 * put to the user.
 *
 * Asking a user to choose between "show a code" and "read a code" asks them to
 * understand the protocol before they can start, and both options read as
 * equally plausible from either device. So neither device chooses: both offer,
 * both watch, and whichever payload arrives first says what this device does.
 *
 * That leaves one race worth taking seriously. If the user scans on *both*
 * devices, each holds the other's offer, and if both answered, both would sit
 * waiting for a reply that no one is going to send. The tie is broken with no
 * extra round trip by comparing device ids — each side already learns its peer's
 * from the payload — and letting only the greater id answer. The other keeps its
 * own offer standing, which is precisely what its peer is about to reply to.
 *
 * Device ids are derived from identity keys, so they are effectively unique; an
 * exact tie can only be a device paired with itself, which resolves to waiting
 * and goes nowhere rather than pretending to succeed.
 */

export type PairingRoleDecision =
  /** This device answers the offer it just took: it becomes the joiner. */
  | 'answer-offer'
  /** This device authored the offer being replied to: it accepts the answer. */
  | 'accept-answer'
  /**
   * This device took an offer it must not answer — its peer is answering the
   * offer this device is already showing. Keep waiting.
   */
  | 'wait-for-answer';

export const resolvePairingRole = (options: {
  /** This device's own identity. */
  deviceId: DeviceId;
  /** What arrived: an opening offer, or a reply to this device's own. */
  payloadKind: PairingPayloadKind;
  /** The device that authored the payload. */
  payloadDeviceId: DeviceId;
}): PairingRoleDecision => {
  if (options.payloadKind === 'answer') return 'accept-answer';
  return String(options.deviceId) > String(options.payloadDeviceId)
    ? 'answer-offer'
    : 'wait-for-answer';
};
