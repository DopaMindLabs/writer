import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import {
  TrustedDeviceStatus,
  asDeviceId,
  type TrustedDeviceRecord,
} from 'writer-sync/core';
import { db } from '@/db/db';
import { createTrustedDeviceStore } from '@/lib/writerSyncIntegration/trustedDeviceStore';
import { currentPrincipal } from '@/lib/writerSyncIntegration/writerEntityMetadata';
import { DeviceSyncTab } from './DeviceSyncTab';

/**
 * The tab is the wiring between the trusted-device registry and the list: it
 * reads what this principal has paired and hands removals back to the store.
 * Driven through the registry rather than around it, so the wiring is what is
 * under test and not a stubbed hook.
 */

const DEVICE = 'AAECAwQFBgcICQoLDA0ODw';

const seedDevice = async (
  overrides: Partial<TrustedDeviceRecord> = {},
): Promise<void> => {
  await createTrustedDeviceStore(db).trust({
    deviceId: asDeviceId(DEVICE),
    publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'aQ', y: 'ag' },
    principalId: await currentPrincipal(),
    addedAt: 1_700_000_000_000,
    displayName: 'Phone',
    status: TrustedDeviceStatus.Active,
    acknowledgedOperations: {},
    ...overrides,
  });
};

describe('DeviceSyncTab', () => {
  it('invites a first pairing when nothing is paired yet', async () => {
    renderWithProviders(<DeviceSyncTab />);

    expect(await screen.findByTestId('trusted-devices-empty')).toBeInTheDocument();
    // The way in lives with the list it fills.
    expect(screen.getByTestId('pair-device-open')).toBeInTheDocument();
  });

  it('lists what this principal has paired', async () => {
    await seedDevice();

    renderWithProviders(<DeviceSyncTab />);

    expect(await screen.findByTestId(`trusted-device-${DEVICE}`)).toHaveTextContent(
      'Phone',
    );
  });

  it('leaves another principal’s devices out of this list', async () => {
    await seedDevice();
    await createTrustedDeviceStore(db).trust({
      deviceId: asDeviceId('BBECAwQFBgcICQoLDA0ODw'),
      publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'aQ', y: 'ag' },
      principalId: 'somebody-else' as Awaited<ReturnType<typeof currentPrincipal>>,
      addedAt: 1_700_000_000_000,
      displayName: 'Not yours',
      status: TrustedDeviceStatus.Active,
      acknowledgedOperations: {},
    });

    renderWithProviders(<DeviceSyncTab />);

    await screen.findByTestId(`trusted-device-${DEVICE}`);
    expect(screen.queryByText('Not yours')).not.toBeInTheDocument();
  });

  it('mounts no pairing dialog until one is asked for', async () => {
    renderWithProviders(<DeviceSyncTab />);
    await screen.findByTestId('trusted-devices-empty');

    // Mounting it early would gather a peer connection for a settings screen
    // nobody has asked to pair from.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the pairing dialog when the section asks for it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DeviceSyncTab />);

    await user.click(await screen.findByTestId('pair-device-open'));

    expect(
      await screen.findByRole('dialog', { name: 'Pair another device' }),
    ).toBeInTheDocument();
  });

  it('opens it from the keyboard too', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DeviceSyncTab />);
    (await screen.findByTestId('pair-device-open')).focus();

    await user.keyboard('{Enter}');

    expect(
      await screen.findByRole('dialog', { name: 'Pair another device' }),
    ).toBeInTheDocument();
  });

  it('records a removal in the registry rather than forgetting the device', async () => {
    const user = userEvent.setup();
    await seedDevice();
    renderWithProviders(<DeviceSyncTab />);
    await screen.findByTestId(`trusted-device-${DEVICE}`);

    await user.click(screen.getByTestId(`trusted-device-remove-${DEVICE}`));

    // The record is kept, revoked: it is what stops the same identity pairing
    // again as though it were new.
    await waitFor(async () => {
      expect(await createTrustedDeviceStore(db).find(asDeviceId(DEVICE))).toMatchObject({
        status: TrustedDeviceStatus.Revoked,
      });
    });
    expect(await screen.findByTestId(`trusted-device-${DEVICE}`)).toHaveAttribute(
      'data-revoked',
      'true',
    );
  });
});
