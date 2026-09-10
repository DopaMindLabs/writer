/**
 * Branded identity types for the provider-neutral sync vocabulary.
 *
 * A branded string is still a `string` at runtime (so it indexes, serialises and
 * compares like one) but is *not* interchangeable with another brand at compile
 * time: a {@link PrincipalId} cannot be passed where a {@link DeviceId} is
 * expected, and neither can be assigned a bare `string`, without an explicit
 * converter. This keeps attribution (a person) and device identity (a key) from
 * ever being confused — a distinction the sync and pairing layers depend on.
 */

declare const brand: unique symbol;
interface Branded<B extends string> {
  readonly [brand]: B;
}

/** The person writing is attributed to. */
export type PrincipalId = string & Branded<'PrincipalId'>;

/** A cryptographic device identity, separate from the principal. */
export type DeviceId = string & Branded<'DeviceId'>;

/** A globally unique operation id, used for idempotence across providers. */
export type OperationId = string & Branded<'OperationId'>;

/** Tag a raw string as a {@link PrincipalId}. The one sanctioned conversion. */
export const asPrincipalId = (value: string): PrincipalId => value as PrincipalId;

/** Tag a raw string as a {@link DeviceId}. The one sanctioned conversion. */
export const asDeviceId = (value: string): DeviceId => value as DeviceId;

/** Tag a raw string as an {@link OperationId}. The one sanctioned conversion. */
export const asOperationId = (value: string): OperationId => value as OperationId;
