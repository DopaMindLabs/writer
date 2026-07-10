import { assertNever, invariant, InvariantError } from './invariant';

describe('invariant', () => {
  it('does not throw for truthy conditions', () => {
    expect(() => {
      invariant(true, 'nope');
      invariant(1, 'nope');
      invariant('x', 'nope');
      invariant({}, 'nope');
    }).not.toThrow();
  });

  it('throws an InvariantError for falsy conditions', () => {
    expect(() => {
      invariant(false, 'boom');
    }).toThrow(InvariantError);
    expect(() => {
      invariant(null, 'boom');
    }).toThrow('boom');
    expect(() => {
      invariant(0, 'boom');
    }).toThrow(InvariantError);
    expect(() => {
      invariant(undefined, 'boom');
    }).toThrow('boom');
  });

  it('supports a lazy message that is only evaluated on failure', () => {
    const message = vi.fn(() => 'computed');

    invariant(true, message);
    expect(message).not.toHaveBeenCalled();

    expect(() => {
      invariant(false, message);
    }).toThrow('computed');
    expect(message).toHaveBeenCalledTimes(1);
  });

  it('narrows the type for the rest of the scope', () => {
    const value: string | null = 'present';
    invariant(value, 'missing');
    expect(value.length).toBe(7);
  });
});

describe('assertNever', () => {
  it('always throws an InvariantError', () => {
    expect(() => assertNever('unexpected' as never)).toThrow(InvariantError);
  });

  it('uses a custom message when provided', () => {
    expect(() => assertNever('x' as never, 'unhandled case')).toThrow(
      'unhandled case',
    );
  });

  it('serialises the offending value by default', () => {
    expect(() => assertNever(42 as never)).toThrow('42');
  });
});
