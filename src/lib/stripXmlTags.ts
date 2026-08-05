const TAG = /<[^>]*>/g;

/**
 * Sanitises a string by removing XML/HTML tags, repeating until the result
 * stops changing.
 *
 * A single pass is not a safe sanitisation: removing one tag can splice its
 * neighbours into a tag that was not there before, so markup could survive a
 * one-shot strip. Repeating to a fixpoint removes that whole class of bypass.
 * The loop is bounded by the input length — every pass that changes the string
 * removes at least one character, so it cannot run longer than that.
 */
export const stripXmlTags = (value: string): string => {
  let text = value;
  let remaining = value.length;
  while (remaining > 0) {
    const stripped = text.replace(TAG, '');
    if (stripped === text) return text;
    text = stripped;
    remaining -= 1;
  }
  return text;
};
