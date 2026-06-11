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
  /^claude\//,
  /^dependabot\//,
  /^release-please/,
];

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
    'Exempt: main, develop, and automation branches',
    '  (claude/*, dependabot/*, release-please*).',
    '',
  ];
  console.error(lines.join('\n'));
  process.exitCode = 1;
};

const main = () => {
  const branch = resolveBranch();
  if (branch.length === 0 || branch === 'HEAD') {
    return;
  }
  const isAllowed = EXEMPT.some((re) => re.test(branch)) || PATTERN.test(branch);
  if (!isAllowed) {
    fail(branch);
  }
};

main();
