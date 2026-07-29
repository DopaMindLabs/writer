/**
 * The engine's own assertion helper. Deliberately not shared with the host
 * application: a package that reached into Writer's `@/lib/invariant` would make
 * the whole engine unusable outside Writer for the sake of ten lines.
 *
 * Internal to the package — not part of any public subpath.
 */

export class InvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvariantError';
  }
}

export const invariant: (
  condition: unknown,
  message: string | (() => string),
) => asserts condition = (condition, message) => {
  if (condition) return;
  throw new InvariantError(typeof message === 'function' ? message() : message);
};
