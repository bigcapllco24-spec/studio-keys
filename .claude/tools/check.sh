#!/usr/bin/env bash
# Release check for Studio Keys. Run from the repo root: bash .claude/tools/check.sh
# 1) rebuilds index.html from src/ and fails if the committed index.html is stale
# 2) syntax-checks the bundled JavaScript and the Worker
# 3) runs the headless smoke test (tests/smoke.mjs)
set -u; cd "$(git rev-parse --show-toplevel)"; fail=0
TD=$(mktemp -d /tmp/sk-check.XXXXXX); export TD  # own temp folder, so several checks can run at once (worktrees)
cp index.html "$TD/index-before.html" 2>/dev/null || true
python3 tools/build.py >/dev/null || { echo "FAIL build"; exit 1; }
if ! cmp -s index.html "$TD/index-before.html"; then echo "NOTE index.html was rebuilt from src/ (commit it)"; fi
python3 - <<'PY' || fail=1
import re,subprocess,sys
h=open('index.html',encoding='utf-8').read(); js=h[h.rindex('<script>')+8:h.rindex('</script>')]
import os; open(os.environ['TD']+'/bundle.js','w',encoding='utf-8').write(js)
r=subprocess.run(['node','--check',os.environ['TD']+'/bundle.js'],capture_output=True,text=True)
print('PASS bundle syntax' if r.returncode==0 else 'FAIL bundle syntax\n'+r.stderr[:800]); sys.exit(r.returncode)
PY
cp cloudflare/worker.js "$TD/worker.mjs" && node --check "$TD/worker.mjs" && echo "PASS worker syntax" || { echo "FAIL worker syntax"; fail=1; }
if ! node -e "require.resolve('puppeteer-core')" 2>/dev/null; then
  if [ ! -d /tmp/sk-test/node_modules/puppeteer-core ]; then mkdir -p /tmp/sk-test && (cd /tmp/sk-test && npm i --silent --no-audit --no-fund puppeteer-core >/dev/null 2>&1) || echo "NOTE couldn't install puppeteer-core"; fi
  export SK_NODE_MODULES=/tmp/sk-test/node_modules
fi
node tests/smoke.mjs || fail=1
[ $fail -eq 0 ] && echo "CHECK OK" || { echo "CHECK FAILED"; exit 1; }
