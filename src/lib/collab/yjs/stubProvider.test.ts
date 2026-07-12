import { describe, expect, it } from 'vitest';
import { createStubProvider } from './stubProvider';

describe('createStubProvider', () => {
  it('exposes an inert awareness and lifecycle so a headless binding has no side effects', () => {
    const provider = createStubProvider();

    expect(provider.awareness.getLocalState()).toBeNull();
    expect(provider.awareness.getStates().size).toBe(0);
    // Every method is a no-op that neither throws nor returns a value.
    expect(provider.awareness.setLocalState(null)).toBeUndefined();
    expect(provider.awareness.setLocalStateField('k', 1)).toBeUndefined();
    expect(provider.connect()).toBeUndefined();
    expect(provider.disconnect()).toBeUndefined();
    const noop = () => undefined;
    expect(provider.awareness.on('update', noop)).toBeUndefined();
    expect(provider.awareness.off('update', noop)).toBeUndefined();
    expect(provider.on('status', noop)).toBeUndefined();
    expect(provider.off('status', noop)).toBeUndefined();
  });
});
