import { readFileSync } from 'node:fs';

// Commit messages may not carry AI assistant names or attribution
// (Co-Authored-By trailers, "Claude Code", codex/*, session links, ...).
// The ONLY permitted occurrence is the literal `.claude` config folder, so a
// commit that edits e.g. `.claude/settings.json` can still name the file it
// touched. Everything else matching `claude` / `codex` is rejected.
const DENY = /\b(?:claude|codex)\b/i;

// Author identity is separately banned from carrying assistant names or
// vendor-noreply mailboxes, so a valid message under a Claude/anthropic
// author no longer slips through.
const AUTHOR_DENY = /\b(?:claude|codex|anthropic|openai)\b/i;

// The commit-msg file also contains git's `#` help lines and, under
// `git commit -v`, the full diff below a scissors marker. Strip both so code
// under review (which may legitimately contain these words) can't trip the
// guard — only the human-authored message is scanned.
const SCISSORS = /^#\s*-+\s*>8\s*-+/;

const resolveMessage = () => {
  const file = process.argv[2];
  if (typeof file !== 'string' || file.trim().length === 0) {
    return '';
  }
  const raw = readFileSync(file.trim(), 'utf8');
  const kept = [];
  for (const line of raw.split('\n')) {
    if (SCISSORS.test(line)) {
      break;
    }
    if (line.startsWith('#')) {
      continue;
    }
    kept.push(line);
  }
  // Drop the one allowed token before scanning.
  return kept.join('\n').replace(/\.claude\b/gi, '');
};

// During the commit-msg hook git exports GIT_AUTHOR_NAME / GIT_AUTHOR_EMAIL
// for the pending commit — the reliable read for the identity being applied
// to this specific commit (rather than the ambient config).
const resolveAuthor = () => ({
  name: process.env.GIT_AUTHOR_NAME ?? '',
  email: process.env.GIT_AUTHOR_EMAIL ?? '',
});

const failMessage = () => {
  const lines = [
    '',
    '✖ Commit message references an AI assistant (claude/codex).',
    '',
    'Remove assistant names and attribution — Co-Authored-By bot trailers,',
    '"Claude Code", codex/*, session links, anthropic noreply addresses.',
    'The only allowed occurrence is the literal `.claude` config folder path.',
    '',
  ];
  console.error(lines.join('\n'));
  process.exitCode = 1;
};

const failAuthor = (name, email) => {
  const lines = [
    '',
    `✖ Commit author references an AI assistant / vendor: "${name} <${email}>"`,
    '',
    'Set a personal git identity (name + email) before committing.',
    'Example (repo-local):',
    '  git config user.name  "Your Name"',
    '  git config user.email "you@users.noreply.github.com"',
    '',
  ];
  console.error(lines.join('\n'));
  process.exitCode = 1;
};

const main = () => {
  const message = resolveMessage();
  if (message.length > 0 && DENY.test(message)) {
    failMessage();
  }
  const { name, email } = resolveAuthor();
  // Only enforce when git has populated the author env vars (commit-msg does;
  // ad-hoc `node scripts/…` invocations do not — those stay lint-only).
  if ((name || email) && AUTHOR_DENY.test(`${name} ${email}`)) {
    failAuthor(name, email);
  }
};

main();
