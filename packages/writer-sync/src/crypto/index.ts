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

export {
  AttachmentContentIntegrityError,
  openAttachmentContent,
  sealAttachmentContent,
} from './attachmentContentCrypto';
export type { AttachmentContentBinding } from './attachmentContentCrypto';

export { fromBase64Url, toBase64Url } from './base64url';

export {
  NonCanonicalJsonError,
  canonicalJson,
  parseCanonicalJson,
} from './canonicalJson';

export {
  DEVICE_IDENTITY_ALGORITHM,
  MalformedDeviceKeyError,
  deviceIdFor,
  generateDeviceIdentity,
  importDevicePublicKey,
  publicJwkOf,
  sameIdentityKey,
} from './deviceIdentity';
export type { DeviceIdentityKeys } from './deviceIdentity';

export {
  MissingSignatureError,
  signPairingPayload,
  verifyPairingPayload,
} from './deviceSignature';

export {
  MissingFrameSignatureError,
  signFrame,
  verifyFrameSignature,
} from './frameSignature';

export { createTrustedFrameVerifier } from './trustedFrameVerifier';

export { pairingTranscript, verificationCode } from './pairingTranscript';

export {
  MalformedEphemeralKeyError,
  derivePairingKey,
  ephemeralPublicJwkOf,
  generatePairingEphemeral,
} from './pairingKeyAgreement';
export type { PairingEphemeralKeys, PairingKeyOptions } from './pairingKeyAgreement';
