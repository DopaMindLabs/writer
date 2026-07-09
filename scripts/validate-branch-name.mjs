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

const resolveBranch = () => {
  const fromArg = process.argv[2];
  if (typeof fromArg === 'string' && fromArg.trim().length > 0) {
    return fromArg.trim();
  }
  return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
};

const fail = (branch) => {
  const lines = [
    '',
    `✖ Invalid branch name: "${branch}"`,
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
  ];
  console.error(lines.join('\n'));
  process.exitCode = 1;
};

const failAssistant = (branch) => {
  console.error(`\n✖ Branch name references an AI assistant: "${branch}"\n`);
  process.exitCode = 1;
};

const main = () => {
  const branch = resolveBranch();
  if (branch.length === 0 || branch === 'HEAD') {
    return;
  }
  if (DENY.test(branch)) {
    failAssistant(branch);
    return;
  }
  const isAllowed = EXEMPT.some((re) => re.test(branch)) || PATTERN.test(branch);
  if (!isAllowed) {
    fail(branch);
  }
};

main();
