/**
 * Pure classifier for a signed-in device's key-acquisition state, derived from
 * which cloud key-state testids are visible on the page. Terminal states drive
 * the harness's next action; `pending` means "keep sampling". Errors take
 * priority (they must stop the run) and are reported distinctly so the harness
 * never mistakes a fetch/offline/limit/revoked condition for a keyless device it
 * could set up.
 */

/** The testids the classifier inspects; the harness samples exactly these. */
export const KEY_STATE_TESTIDS = [
  'cloud-device-limit',
  'cloud-device-revoked',
  'cloud-keyless-fetch-failed',
  'cloud-keyless-offline',
  'cloud-forget',
  'cloud-keyless-locked',
  'cloud-keyless-nokey',
];

/**
 * @param {readonly string[]} presentTestIds - the key-state testids currently visible.
 * @returns {'keyed'|'unlock'|'setup'|'pending'|`error:${string}`}
 */
export const classifyKeyState = (presentTestIds) => {
  const has = (id) => presentTestIds.includes(id);
  if (has('cloud-device-limit')) return 'error:device-limit';
  if (has('cloud-device-revoked')) return 'error:revoked';
  if (has('cloud-keyless-fetch-failed')) return 'error:fetch-failed';
  if (has('cloud-keyless-offline')) return 'error:offline';
  if (has('cloud-forget')) return 'keyed';
  if (has('cloud-keyless-locked')) return 'unlock';
  if (has('cloud-keyless-nokey')) return 'setup';
  return 'pending';
};

export const isErrorKeyState = (state) => state.startsWith('error:');

export const isTerminalKeyState = (state) => state !== 'pending';
