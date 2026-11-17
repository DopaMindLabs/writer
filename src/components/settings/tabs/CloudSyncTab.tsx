import { TabHeader } from '@/components/settings/TabHeader';
import { CloudSection } from './cloud/CloudSection';

/**
 * Cloud sync: the signed-in account, its encryption key and the devices on it.
 *
 * A tab of its own rather than a section of the profile, because the two are
 * unrelated. A profile is a name and a colour that never leave this device; a
 * cloud account is a sign-in on someone else's server. Housing them together is
 * what made "account" mean two things at once, and reading one label as the
 * other is what let a boot guard confuse "signed in" with "holds the key".
 */
export const CloudSyncTab = () => (
  <section>
    <TabHeader
      titleKey="settings.cloud.tabTitle"
      subtitleKey="settings.cloud.tabSubtitle"
    />
    <CloudSection />
  </section>
);
