# Branch check brief (qa-tester) · 13 Nov 2026 · UX-1 and SE-3

Read `.claude/standards/dev-standards.md` first (Quality bar, Production and assistant rules). You are qa-tester: read `.claude/agents/qa-tester.md` and follow it as your role. You never change product code (`src/`, `cloudflare/`); you own `tests/**` and `.claude/tools/check.sh`.

Two testers run at the same time, one per branch. `check.sh` writes fixed files in /tmp (`/tmp/sk-bundle.js`, `/tmp/sk-index-before.html`, `/tmp/sk-worker.mjs`): if a FAIL looks like a clash with the other run, rerun it.

Commit messages end with:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HCuZAQiMb134PWfp7hriKs
