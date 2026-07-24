import type { Template } from './types';

/**
 * Whether a space built from this template lets the user manage its section
 * structure — add, rename, delete, and reorder sections.
 *
 * Configuration is **on by default**: a template only opts out by setting
 * `allowConfiguration: false` to lock its seeded shape. An absent template
 * (space not loaded, or an unknown template id) is treated as not configurable
 * so the management affordances stay hidden until the real template resolves.
 */
export const templateAllowsConfiguration = (
  template: Template | undefined,
): boolean => template !== undefined && template.allowConfiguration !== false;
