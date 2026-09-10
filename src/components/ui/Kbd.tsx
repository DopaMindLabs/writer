import { cn } from '@/lib/utils';
import { formatChord } from '@/lib/shortcuts/formatChord';

export interface KbdProps {
  /**
   * A chord written platform-neutrally: `mod` resolves to ⌘ or Ctrl, plus
   * `shift` / `alt` / `enter`, joined with `+` — e.g. `mod+,`, `mod+shift+m`,
   * or a bare key like `?`. Never write a platform glyph directly.
   */
  keys: string;
  className?: string;
}

/**
 * A keyboard-shortcut hint in the mono meta voice (10 px, `ink-4`). The
 * modifier is derived from the running platform at render, so each user sees
 * the key they press. On Apple the glyphs sit adjacent (`⌘⇧M`); elsewhere the
 * words join with `+` (`Ctrl+Shift+M`). Copy that needs the same text inside a
 * sentence formats it with {@link formatChord} rather than embedding a glyph.
 */
export const Kbd = ({ keys, className }: KbdProps) => {
  const display = formatChord(keys);
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
