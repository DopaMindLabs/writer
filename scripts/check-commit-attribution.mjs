import { readFileSync } from 'node:fs';

// AI attribution / branding trailers that must never land in a commit message.
// Scoped to attribution only — legitimate prose and paths such as
// `.claude/settings.json`, `claude/*`, or "Claude Code" stay allowed.
const FORBIDDEN = [
  /co-authored-by:.*(?:claude|codex)/i,
  /claude\.ai\/code/i,
  /claude-session/i,
  /chatgpt\.com\/codex/i,
  /generated with .*(?:claude|codex)/i,
  /noreply@anthropic\.com/i,
];

const resolveMessage = () => {
  const file = process.argv[2];
  if (typeof file !== 'string' || file.trim().length === 0) {
    return '';
  }
  return readFileSync(file.trim(), 'utf8');
};

const fail = (matched) => {
  const lines = [
    '',
    '✖ Commit message contains AI attribution:',
    `  matched: ${matched.source}`,
    '',
    'Remove Co-Authored-By: Claude/Codex, claude.ai/code, Claude-Session,',
    'chatgpt.com/codex trailers and anthropic noreply addresses.',
    '',
  ];
  console.error(lines.join('\n'));
  process.exitCode = 1;
};

const main = () => {
  const message = resolveMessage();
  if (message.length === 0) {
    return;
  }
  const hit = FORBIDDEN.find((re) => re.test(message));
  if (hit) {
    fail(hit);
  }
};

main();
