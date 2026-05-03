#!/bin/sh
# render_inject_env.sh
# ─────────────────────────────────────────────────────────────────────────────
# Runs ONCE at container startup on Render BEFORE serving the React app.
# Replaces the placeholder strings in the built index.html with the actual
# Render environment variable values.
#
# Set these in Render → Your Service → Environment:
#   SUPABASE_URL
#   SUPABASE_ANON_KEY
# ─────────────────────────────────────────────────────────────────────────────

INDEX_FILE="./web/build/index.html"

if [ ! -f "$INDEX_FILE" ]; then
  echo "ERROR: $INDEX_FILE not found. Run 'npm run build' in web/ first."
  exit 1
fi

echo "Injecting Render environment variables into $INDEX_FILE ..."

# Replace URL placeholder
sed -i "s|RENDER_SUPABASE_URL_PLACEHOLDER|${SUPABASE_URL}|g" "$INDEX_FILE"

# Replace anon key placeholder
sed -i "s|RENDER_SUPABASE_ANON_KEY_PLACEHOLDER|${SUPABASE_ANON_KEY}|g" "$INDEX_FILE"

echo "Done. Starting server..."

# Start the static file server (serve package)
npx serve -s web/build -l ${PORT:-3000}
