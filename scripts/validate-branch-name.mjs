import { execSync } from 'node:child_process';

const TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
];

const PATTERN = new RegExp(`^(?:${TYPES.join('|')})/[a-z0-9]+(?:[-_][a-z0-9]+)*$`);

const EXEMPT = [
  /^main$/,
  /^master$/,
  /^develop$/,
  /^dependabot\//,
  /^release-please/,
  /^release\//,
  /^rc\//,
  /^pre-release\//,
];

// Branch names may never reference an AI assistant, even inside an otherwise
// valid or exempt name (e.g. `feat/claude-x`). This takes precedence over both
// EXEMPT and PATTERN.
const DENY = /claude|codex/i;

// Flags are separated from an optional positional branch override so callers
// like pre-push (no args) and post-checkout (`--warn`) both work.
const parseArgs = () => {
  const rest = process.argv.slice(2);
  const warn = rest.includes('--warn');
  const branchArg = rest.find((arg) => !arg.startsWith('--'));
  return { warn, branchArg };
};

const resolveBranch = (branchArg) => {
  if (typeof branchArg === 'string' && branchArg.trim().length > 0) {
    return branchArg.trim();
  }
  return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
};

// In warn mode (post-checkout) we surface the problem but never block: git
// ignores the hook's exit code there, and a freshly-created branch shouldn't
// look like a hard failure. Everywhere else an invalid name is fatal.
const report = (lines, warn) => {
  console.error(lines.join('\n'));
  if (!warn) process.exitCode = 1;
};

const glyph = (warn) => (warn ? '⚠ Warning' : '✖');

const failFormat = (branch, warn) => {
  report(
    [
      '',
      `${glyph(warn)}: invalid branch name "${branch}"`,
      '',
      'Branches must be prefixed with a Conventional Commit type:',
      `  ${TYPES.join(', ')}`,
      '',
      'Use the form  <type>/<kebab-description>  (underscores allowed for suffixes)',
      '  e.g.  feat/user-login   fix/date-parse   chore/bump-deps   feat/user-login_v2',
      '',
      'Exempt: main, develop, and automation / release branches',
      '  (dependabot/*, release-please*, release/*, rc/*, pre-release/*).',
      '',
    ],
    warn,
  );
};

const failAssistant = (branch, warn) => {
  report(
    ['', `${glyph(warn)}: branch name references an AI assistant: "${branch}"`, ''],
    warn,
  );
};

const main = () => {
  const { warn, branchArg } = parseArgs();
  const branch = resolveBranch(branchArg);
  if (branch.length === 0 || branch === 'HEAD') {
    return;
  }
  if (DENY.test(branch)) {
    failAssistant(branch, warn);
    return;
  }
  const isAllowed = EXEMPT.some((re) => re.test(branch)) || PATTERN.test(branch);
  if (!isAllowed) {
    failFormat(branch, warn);
  }
};

main();
