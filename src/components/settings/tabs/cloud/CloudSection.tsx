import { isCloudSyncEnabled } from '@/lib/cloud/cloudClient';
import { CloudSectionPanel } from './CloudSectionPanel';

/**
 * Self-gating entry point for the cloud-sync beta section. Renders nothing
 * unless both activation gates are on, so the Account tab can drop it in
 * unconditionally without changing the default experience.
 */
export const CloudSection = () =>
  isCloudSyncEnabled() ? <CloudSectionPanel /> : null;
