#!/bin/bash
# Pre-build: empty out the stub api/*.js files so Vercel doesn't count them as separate functions.
# Only api/[...path].js remains as a single deployable serverless function.
for f in activity agent-run agents approvals db-client db-wake messages orders projects research researcher-fetch reviews tasks team-review; do
  if [ -f "api/${f}.js" ] && [ -w "api/${f}.js" ]; then
    echo "// stub - disabled - real handler is api/[...path].js" > "api/${f}.js"
  fi
done
exit 0
