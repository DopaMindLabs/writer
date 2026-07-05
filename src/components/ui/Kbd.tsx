import { cn } from '@/lib/utils';
import { isApplePlatform } from '@/lib/shortcuts/platform';

export interface KbdProps {
  /**
   * A chord written platform-neutrally: `mod` resolves to ⌘ or Ctrl, plus
   * `shift` / `alt` / `enter`, joined with `+` — e.g. `mod+,`, `mod+shift+m`,
   * or a bare key like `?`. Never write a platform glyph directly.
   */
  keys: string;
  className?: string;
}

const tokenLabel = (token: string, apple: boolean): string => {
  const key = token.toLowerCase();
  if (key === 'mod') return apple ? '⌘' : 'Ctrl';
  if (key === 'shift') return apple ? '⇧' : 'Shift';
  if (key === 'alt') return apple ? '⌥' : 'Alt';
  if (key === 'enter') return apple ? '⏎' : 'Enter';
  return token.length === 1 ? token.toUpperCase() : token;
};

/**
 * A keyboard-shortcut hint in the mono meta voice (10 px, `ink-4`). The
 * modifier is derived from the running platform at render, so each user sees
 * the key they press. On Apple the glyphs sit adjacent (`⌘⇧M`); elsewhere the
 * words join with `+` (`Ctrl+Shift+M`).
 */
export const Kbd = ({ keys, className }: KbdProps) => {
  const apple = isApplePlatform();
  const tokens = keys.split('+').map((token) => tokenLabel(token, apple));
  const display = apple ? tokens.join('') : tokens.join('+');
  return (
    <kbd
      className={cn(
        'font-mono text-[10px] tracking-wide text-ink-4',
        className,
      )}
    >
      {display}
    </kbd>
  );
};
