#!/bin/sh
set -e

INDEX="./web/build/index.html"

if [ ! -f "$INDEX" ]; then
  echo "index.html not found — building first..."
  cd web && npm install && npm run build && cd ..
fi

echo "Injecting environment variables..."
sed -i "s|RENDER_SUPABASE_URL_PLACEHOLDER|${SUPABASE_URL}|g" "$INDEX"
sed -i "s|RENDER_SUPABASE_ANON_KEY_PLACEHOLDER|${SUPABASE_ANON_KEY}|g" "$INDEX"

echo "Done. SUPABASE_URL = ${SUPABASE_URL}"
echo "Starting server on port ${PORT:-3000}..."

npx serve -s web/build -l ${PORT:-3000}
