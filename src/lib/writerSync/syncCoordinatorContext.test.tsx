import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createSyncCoordinator } from '@/lib/syncProviders/coordinator';
import type { KeyDeliveryAdapter, SyncProvider } from '@/lib/syncProviders/types';
import { KeyEscrowPresence } from '@/lib/syncProviders/types';
import { WriterSyncProvider } from './WriterSyncProvider';
import { useSyncCapability, useSyncCoordinator } from './syncCoordinatorContext';

const keyDelivery = (): KeyDeliveryAdapter => ({
  setUp: () => Promise.resolve('recovery-code'),
  unlock: () => Promise.resolve(),
  recover: () => Promise.resolve(),
  escrowPresence: {
    subscribe: (next) => {
      next(KeyEscrowPresence.Present);
      return { unsubscribe: () => undefined };
    },
  },
});

const providerWithKeyDelivery: SyncProvider = { id: 'test-cloud', keyDelivery: keyDelivery() };
const providerWithout: SyncProvider = { id: 'test-peer' };

const CapabilityProbe = () => {
  const capability = useSyncCapability('keyDelivery');
  return <span data-testid="probe">{capability ? 'available' : 'absent'}</span>;
};

const CoordinatorProbe = () => {
  const coordinator = useSyncCoordinator();
  return <span data-testid="probe">{coordinator.providers().length}</span>;
};

const renderIn = (providers: SyncProvider[], ui: React.ReactNode) =>
  render(
    <WriterSyncProvider coordinator={createSyncCoordinator({ providers })}>{ui}</WriterSyncProvider>,
  );

describe('useSyncCapability', () => {
  it('resolves a capability from the configured provider', () => {
    renderIn([providerWithKeyDelivery], <CapabilityProbe />);

    expect(screen.getByTestId('probe')).toHaveTextContent('available');
  });

  it('reports absence when no provider offers it', () => {
    renderIn([providerWithout], <CapabilityProbe />);

    expect(screen.getByTestId('probe')).toHaveTextContent('absent');
  });

  it('reports absence outside a provider, so an injected component still renders', () => {
    render(<CapabilityProbe />);

    expect(screen.getByTestId('probe')).toHaveTextContent('absent');
  });

  it('hands back a working capability, not just its presence', async () => {
    let resolved: string | undefined;
    const Probe = () => {
      const capability = useSyncCapability('keyDelivery');
      void capability?.setUp('passphrase').then((code) => {
        resolved = code;
      });
      return null;
    };

    renderIn([providerWithKeyDelivery], <Probe />);
    await Promise.resolve();

    expect(resolved).toBe('recovery-code');
  });
});

describe('useSyncCoordinator', () => {
  it('exposes the coordinator to the tree', () => {
    renderIn([providerWithKeyDelivery, providerWithout], <CoordinatorProbe />);

    expect(screen.getByTestId('probe')).toHaveTextContent('2');
  });

  it('refuses to run outside a provider, rather than guessing a coordinator', () => {
    expect(() => render(<CoordinatorProbe />)).toThrow(/WriterSyncProvider/);
  });
});
