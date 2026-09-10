import { deviceKeyProvider } from '@/lib/cloud/crypto/keyStore';
import { deviceIdentityStore } from '@/lib/cloud/crypto/deviceIdentityStore';
import type { JournalIdentity } from './operationJournalMiddleware';

/**
 * What this device signs and seals frames with: its key resolver and its
 * identity.
 *
 * Shared because a frame is authored in two places — the journal middleware as
 * a write happens, and the rebuild served to a peer the journal cannot answer —
 * and the two must speak for the same device. Composing them separately would
 * let one drift onto a different identity, and a frame signed by a device id it
 * does not claim is refused by every peer.
 */

export const writerJournalIdentity = async (): Promise<JournalIdentity> => {
  const { deviceId, keys } = await deviceIdentityStore.load();
  return { deviceId, privateKey: keys.privateKey };
};

export const writerJournalDeps = {
  resolver: deviceKeyProvider,
  identity: writerJournalIdentity,
};
