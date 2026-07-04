import { isLocalNetworkSyncAvailable } from '@/lib/localNetworkSync/flag';
import { LocalNetworkSyncSectionPanel } from './LocalNetworkSyncSectionPanel';

/**
 * Self-gating entry point for the local-network sync beta. Renders nothing
 * unless the build and device gates are on, so the Account tab can include it
 * without changing the default experience.
 */
export const LocalNetworkSyncSection = () =>
  isLocalNetworkSyncAvailable() ? <LocalNetworkSyncSectionPanel /> : null;
