/**
 * The Dexie Cloud provider's identity, in its own module so adapter internals
 * (realm binding, membership) can name the provider instance they write bindings
 * for without importing the provider itself — which imports them.
 */

/** The configured instance id of Writer's Dexie Cloud provider. */
export const DEXIE_CLOUD_PROVIDER_ID = 'dexie-cloud';

/** The provider kind: which engine implementation backs the instance. */
export const DEXIE_CLOUD_PROVIDER_KIND = 'dexie-cloud';
