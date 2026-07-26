/**
 * The encryption seams: how a key is resolved for a given row or operation, what
 * a device vault must be able to do, and the sealing of an operation payload.
 *
 * The engine never implements key storage — an application supplies a resolver
 * and a vault — but it does own the payload format, so every provider carries
 * identical bytes.
 */

export type {
  ScopeKeyContext,
  ScopeKeyResolver,
  SyncKeyRing,
} from './keyResolver';

export type {
  DeviceKeyVault,
  PairingRootWrapper,
  VaultBinding,
} from './keyVault.types';

export {
  MalformedBinaryTagError,
  fromBase64,
  tagBinary,
  toBase64,
  untagBinary,
} from './binaryJson';

export {
  OperationPayloadIntegrityError,
  openOperationPayload,
  sealOperationPayload,
} from './operationCrypto';
