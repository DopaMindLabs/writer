import { describe, expect, it } from 'vitest';
import { toPeerLinkState } from './peerLinkState';

describe('toPeerLinkState', () => {
  it('reads a link that has not established yet as connecting', () => {
    expect(toPeerLinkState('new')).toBe('connecting');
    expect(toPeerLinkState('connecting')).toBe('connecting');
  });

  it('reads a working link as connected', () => {
    expect(toPeerLinkState('connected')).toBe('connected');
  });

  it('reads both ways a link can drop as one interruption', () => {
    // They differ in whether the browser still hopes to recover, which is not a
    // difference a caller can act on: with no signalling channel there is no ICE
    // restart to attempt, so both mean "carrying nothing, and a fresh exchange
    // is what brings it back".
    expect(toPeerLinkState('disconnected')).toBe('interrupted');
    expect(toPeerLinkState('failed')).toBe('interrupted');
  });

  it('reads a torn-down link as closed', () => {
    expect(toPeerLinkState('closed')).toBe('closed');
  });

  it('claims nothing for a state it does not recognise', () => {
    // Neither a working link nor a lost one — reporting either from a value this
    // build has never seen would be an invention.
    expect(toPeerLinkState('something-else')).toBe('connecting');
    expect(toPeerLinkState('')).toBe('connecting');
  });
});
