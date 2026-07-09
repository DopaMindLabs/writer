import { readFileSync } from 'node:fs';

// Commit messages may not carry AI assistant names or attribution
// (Co-Authored-By trailers, "Claude Code", codex/*, session links, ...).
// The ONLY permitted occurrence is the literal `.claude` config folder, so a
// commit that edits e.g. `.claude/settings.json` can still name the file it
// touched. Everything else matching `claude` / `codex` is rejected.
const DENY = /\b(?:claude|codex)\b/i;

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

const fail = () => {
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

const main = () => {
  const message = resolveMessage();
  if (message.length === 0) {
    return;
  }
  if (DENY.test(message)) {
    fail();
  }
};

main();
