/**
 * Build-time app version, taken verbatim from package.json (managed by
 * release-please), including any release channel as a semver pre-release
 * suffix, e.g. "0.6.0-alpha". Single source for every surface that shows the
 * version; narrow surfaces truncate it with CSS (`truncate`), never by
 * hard-coding a shortened string.
 */
export const APP_VERSION_LABEL = __APP_VERSION__;
