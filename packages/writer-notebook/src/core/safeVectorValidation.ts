import {
  DEFAULT_SAFE_VECTOR_LIMITS,
  type SafeVectorLimits,
} from './limits';
import type { SafeVectorDocumentV1, SafeVectorPath } from './safeVector.types';

const PATH_CHARACTERS = /^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]+$/;
const PATH_COMMANDS = /[MmLlHhVvCcSsQqTtAaZz]/g;
const PATH_NUMBERS = /[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g;
const SAFE_FILL = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;
const DOCUMENT_KEYS = new Set(['version', 'width', 'height', 'paths']);
const PATH_KEYS = new Set(['d', 'fill']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOnlyKeys = (value: Record<string, unknown>, allowed: ReadonlySet<string>): boolean =>
  Object.keys(value).every((key) => allowed.has(key));

const assertDimension = (value: unknown, name: string, maximum: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > maximum) {
    throw new TypeError(`${name} must be a finite positive number within the page limit`);
  }
  return value;
};

const assertPathData = (value: unknown, limits: SafeVectorLimits): string => {
  if (typeof value !== 'string' || value.length === 0 || !PATH_CHARACTERS.test(value)) {
    throw new TypeError('Vector path data contains unsupported syntax');
  }
  if (new TextEncoder().encode(value).byteLength > limits.maxPathBytes) {
    throw new RangeError('Vector path data exceeds the byte limit');
  }
  const commands = value.match(PATH_COMMANDS) ?? [];
  if (commands.length === 0 || commands.length > limits.maxCommandsPerPath) {
    throw new RangeError('Vector path command count is outside the allowed range');
  }
  const numbers = value.match(PATH_NUMBERS) ?? [];
  if (numbers.some((number) => !Number.isFinite(Number(number)))) {
    throw new TypeError('Vector path contains a non-finite number');
  }
  return value;
};

const parsePath = (value: unknown, limits: SafeVectorLimits): SafeVectorPath => {
  if (!isRecord(value) || !hasOnlyKeys(value, PATH_KEYS)) {
    throw new TypeError('Vector path must contain only path data and fill');
  }
  const d = assertPathData(value.d, limits);
  if (typeof value.fill !== 'string' || !SAFE_FILL.test(value.fill)) {
    throw new TypeError('Vector path fill is outside the safe colour grammar');
  }
  return { d, fill: value.fill };
};

const resolveLimits = (overrides?: Partial<SafeVectorLimits>): SafeVectorLimits => ({
  ...DEFAULT_SAFE_VECTOR_LIMITS,
  ...overrides,
});

export const parseSafeVectorDocument = (
  input: unknown,
  overrides?: Partial<SafeVectorLimits>,
): SafeVectorDocumentV1 => {
  const limits = resolveLimits(overrides);
  if (!isRecord(input) || !hasOnlyKeys(input, DOCUMENT_KEYS) || input.version !== 1) {
    throw new TypeError('Unsupported safe-vector document');
  }
  if (!Array.isArray(input.paths) || input.paths.length > limits.maxPaths) {
    throw new RangeError('Safe-vector path count exceeds the configured path count limit');
  }
  const parsed: SafeVectorDocumentV1 = {
    version: 1,
    width: assertDimension(input.width, 'width', limits.maxDimension),
    height: assertDimension(input.height, 'height', limits.maxDimension),
    paths: input.paths.map((path) => parsePath(path, limits)),
  };
  if (new TextEncoder().encode(JSON.stringify(parsed)).byteLength > limits.maxBytes) {
    throw new RangeError('Safe-vector document exceeds the byte limit');
  }
  return parsed;
};
