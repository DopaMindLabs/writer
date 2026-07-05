/**
 * Build-time app version, taken verbatim from package.json (managed by
 * release-please), including any release channel as a semver pre-release
 * suffix, e.g. "0.6.0-alpha". Single source for every surface that shows the
 * version; narrow surfaces truncate it with CSS (`truncate`), never by
 * hard-coding a shortened string.
 */
export const APP_VERSION_LABEL = __APP_VERSION__;

/** Short commit SHA the app was built from, or `unknown` if git was unavailable. */
export const APP_COMMIT = __APP_COMMIT__;

/** ISO-8601 timestamp of the build. */
export const APP_BUILD_TIME = __APP_BUILD_TIME__;
