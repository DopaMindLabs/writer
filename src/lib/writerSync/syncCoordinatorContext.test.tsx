import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createSyncCoordinator } from '@/lib/syncProviders/coordinator';
import type {
  KeyDeliveryAdapter,
  SyncConfiguration,
  SyncProvider,
} from '@/lib/syncProviders/types';
import { KeyEscrowPresence } from '@/lib/syncProviders/types';
import { WriterSyncProvider } from './WriterSyncProvider';
import {
  useDefaultSyncCapability,
  useSyncCapabilities,
  useSyncCapability,
  useSyncCoordinator,
} from './syncCoordinatorContext';

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

const providerWithKeyDelivery: SyncProvider = {
  id: 'test-cloud',
  kind: 'dexie-cloud',
  keyDelivery: keyDelivery(),
};
const providerWithout: SyncProvider = { id: 'test-peer', kind: 'webrtc' };

const renderIn = (config: SyncConfiguration, ui: React.ReactNode) =>
  render(
    <WriterSyncProvider coordinator={createSyncCoordinator(config)}>{ui}</WriterSyncProvider>,
  );

describe('useSyncCapability (explicit instance)', () => {
  const Probe = ({ id }: { id: string }) => {
    const capability = useSyncCapability(id, 'keyDelivery');
    return <span data-testid="probe">{capability ? 'available' : 'absent'}</span>;
  };

  it('resolves a capability from a named provider instance', () => {
    renderIn({ providers: [providerWithKeyDelivery] }, <Probe id="test-cloud" />);

    expect(screen.getByTestId('probe')).toHaveTextContent('available');
  });

  it('reports absence for an instance that does not offer it', () => {
    renderIn(
      { providers: [providerWithKeyDelivery, providerWithout] },
      <Probe id="test-peer" />,
    );

    expect(screen.getByTestId('probe')).toHaveTextContent('absent');
  });

  it('reports absence outside a provider, so an injected component still renders', () => {
    render(<Probe id="test-cloud" />);

    expect(screen.getByTestId('probe')).toHaveTextContent('absent');
  });
});

describe('useDefaultSyncCapability', () => {
  const Probe = () => {
    const capability = useDefaultSyncCapability('keyDelivery');
    return <span data-testid="probe">{capability ? 'available' : 'absent'}</span>;
  };

  it('resolves the capability from the configured default provider', () => {
    renderIn(
      {
        providers: [providerWithKeyDelivery],
        defaultProviderInstanceId: 'test-cloud',
      },
      <Probe />,
    );

    expect(screen.getByTestId('probe')).toHaveTextContent('available');
  });

  it('reports absence when no default is configured — never the first provider', () => {
    renderIn({ providers: [providerWithKeyDelivery] }, <Probe />);

    expect(screen.getByTestId('probe')).toHaveTextContent('absent');
  });

  it('reports absence when the default provider lacks the capability', () => {
    renderIn(
      {
        providers: [providerWithout, providerWithKeyDelivery],
        defaultProviderInstanceId: 'test-peer',
      },
      <Probe />,
    );

    expect(screen.getByTestId('probe')).toHaveTextContent('absent');
  });

  it('hands back a working capability, not just its presence', async () => {
    let resolved: string | undefined;
    const Setup = () => {
      const capability = useDefaultSyncCapability('keyDelivery');
      void capability?.setUp('passphrase').then((code) => {
        resolved = code;
      });
      return null;
    };

    renderIn(
      { providers: [providerWithKeyDelivery], defaultProviderInstanceId: 'test-cloud' },
      <Setup />,
    );
    await Promise.resolve();

    expect(resolved).toBe('recovery-code');
  });
});

describe('useSyncCapabilities (aggregate)', () => {
  const Probe = () => {
    const capabilities = useSyncCapabilities('keyDelivery');
    return <span data-testid="probe">{capabilities.length}</span>;
  };

  it('aggregates the capability across every provider that offers it', () => {
    const second: SyncProvider = { id: 'second-cloud', kind: 'dexie-cloud', keyDelivery: keyDelivery() };
    renderIn({ providers: [providerWithKeyDelivery, providerWithout, second] }, <Probe />);

    expect(screen.getByTestId('probe')).toHaveTextContent('2');
  });

  it('is empty outside a provider', () => {
    render(<Probe />);

    expect(screen.getByTestId('probe')).toHaveTextContent('0');
  });
});

describe('useSyncCoordinator', () => {
  const Probe = () => {
    const coordinator = useSyncCoordinator();
    return <span data-testid="probe">{coordinator.providers().length}</span>;
  };

  it('exposes the coordinator to the tree', () => {
    renderIn({ providers: [providerWithKeyDelivery, providerWithout] }, <Probe />);

    expect(screen.getByTestId('probe')).toHaveTextContent('2');
  });

  it('refuses to run outside a provider, rather than guessing a coordinator', () => {
    expect(() => render(<Probe />)).toThrow(/WriterSyncProvider/);
  });
});
