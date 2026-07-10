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

export const assertNever = (value: never, message?: string): never => {
  throw new InvariantError(
    message ?? `Unexpected value: ${JSON.stringify(value)}`,
  );
};
