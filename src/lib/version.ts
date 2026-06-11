/**
 * Build-time app version with its release channel as a semver pre-release
 * suffix, e.g. "0.5.0-alpha". Single source for every surface that shows the
 * version; narrow surfaces truncate it with CSS (`truncate`), never by
 * hard-coding a shortened string.
 */
export const APP_VERSION_LABEL = `${__APP_VERSION__}-alpha`;
