/**
 * Application logger facade.
 *
 * Production code logs through this object instead of calling `console.*`
 * directly. The seam lets tests silence and assert on log output by spying on
 * `appLogger` (e.g. `vi.spyOn(appLogger, 'warn').mockImplementation(() => {})`)
 * rather than patching the global console, so intentional diagnostics never
 * leak into test stdout while their behaviour stays assertable.
 */
type LogMethod = (...args: readonly unknown[]) => void;

export interface AppLogger {
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
}

export const appLogger: AppLogger = {
  info: (...args) => {
    console.info(...args);
  },
  warn: (...args) => {
    console.warn(...args);
  },
  error: (...args) => {
    console.error(...args);
  },
};
