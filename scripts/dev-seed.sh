#!/usr/bin/env bash
# Seed local R2 for development.
# Uploads public/ and blueprints/ to the preview R2 bucket so
# wrangler dev serves current files.
#
# Usage: ./scripts/dev-seed.sh

set -euo pipefail
cd "$(dirname "$0")/.."

echo "Seeding local R2 (weblisk-public-preview)..."

# Upload public/ files (strip public/ prefix for R2 key)
find ./public -type f \( \
  -name '*.html' -o \
  -name '*.css' -o \
  -name '*.js' -o \
  -name '*.svg' -o \
  -name '*.png' -o \
  -name '*.jpg' -o \
  -name '*.webp' -o \
  -name '*.ico' -o \
  -name '*.woff2' -o \
  -name '*.xml' -o \
  -name 'manifest.webmanifest' -o \
  -name 'robots.txt' -o \
  -name 'llms.txt' \
\) | while read -r file; do
  key="${file#./public/}"
  npx wrangler r2 object put "weblisk-public-preview/${key}" --file "$file" --local 2>/dev/null
done
echo "✓ public/ uploaded"

# Upload blueprints/ (keep blueprints/ prefix for R2 key)
find ./blueprints -type f \( -name '*.yaml' -o -name '*.yml' \) | while read -r file; do
  key="${file#./}"
  npx wrangler r2 object put "weblisk-public-preview/${key}" --file "$file" --local 2>/dev/null
done
echo "✓ blueprints/ uploaded"

echo "Done. Run: npx wrangler dev --port 8787"
