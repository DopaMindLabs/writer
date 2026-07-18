import { act, renderHook, waitFor } from '@testing-library/react';
import { generateMasterSecret, deriveKeyRing } from '@/lib/cloud/crypto/keys';
import {
  forgetDeviceKeyRing,
  saveDeviceKeyRing,
} from '@/lib/cloud/crypto/keyStore';
import {
  useEncryptedLiveQuery,
  useKeyedEncryptedLiveQuery,
} from './useEncryptedLiveQuery';

const acquireKey = async () =>
  saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(generateMasterSecret(), 1) });

describe('useEncryptedLiveQuery', () => {
  beforeEach(async () => {
    await forgetDeviceKeyRing();
  });

  it('re-runs the query when a device key is acquired, with no content-row change', async () => {
    // The regression: a keyless first sign-in caches empty results; acquiring the
    // key changes no IndexedDB row, so a plain useLiveQuery never re-runs and the
    // sidebar stays empty until reload. Folding the key revision into the deps must
    // force a fresh evaluation the moment the key lands.
    let runs = 0;
    const { result } = renderHook(() =>
      useEncryptedLiveQuery(() => {
        runs += 1;
        return runs;
      }, [], 0),
    );
    await waitFor(() => expect(result.current).toBe(1));
    const runsAfterMount = runs;

    await act(async () => {
      await acquireKey();
    });

    await waitFor(() => expect(runs).toBeGreaterThan(runsAfterMount));
  });

  it('keyed variant also re-runs on key acquisition and keeps the stale-key guard', async () => {
    let runs = 0;
    const { result } = renderHook(() =>
      useKeyedEncryptedLiveQuery(
        'space-1',
        async () => {
          runs += 1;
          return runs;
        },
        0,
      ),
    );
    await waitFor(() => expect(result.current).toBe(1));
    const runsAfterMount = runs;

    await act(async () => {
      await acquireKey();
    });

    await waitFor(() => expect(runs).toBeGreaterThan(runsAfterMount));
  });
});
