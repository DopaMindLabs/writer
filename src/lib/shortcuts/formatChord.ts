import { isApplePlatform, type PlatformNavigator } from './platform';

const tokenLabel = (token: string, apple: boolean): string => {
  const key = token.toLowerCase();
  if (key === 'mod') return apple ? '⌘' : 'Ctrl';
  if (key === 'shift') return apple ? '⇧' : 'Shift';
  if (key === 'alt') return apple ? '⌥' : 'Alt';
  if (key === 'enter') return apple ? '⏎' : 'Enter';
  return token.length === 1 ? token.toUpperCase() : token;
};

/**
 * A chord written platform-neutrally — `mod+,`, `mod+shift+m`, `mod+\`, or a
 * bare key like `?` — as the text a user of the running platform reads. On
 * Apple the glyphs sit adjacent (`⌘⇧M`); elsewhere the words join with `+`
 * (`Ctrl+Shift+M`). `nav` is injectable for tests. Never write a platform glyph
 * into copy directly; format the chord here so the hint matches the key pressed.
 */
export const formatChord = (keys: string, nav?: PlatformNavigator): string => {
  const apple = isApplePlatform(nav);
  const tokens = keys.split('+').map((token) => tokenLabel(token, apple));
  return apple ? tokens.join('') : tokens.join('+');
};
