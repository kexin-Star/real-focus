#!/bin/bash

# Update Chrome Extension files
# This script ensures the extension directory is ready for use
# No zip file is created - use the extension/ directory directly

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_DIR="$SCRIPT_DIR/extension"

echo "📦 Updating Chrome Extension files..."
echo "Extension directory: $EXTENSION_DIR"
echo ""

# Check if extension directory exists
if [ ! -d "$EXTENSION_DIR" ]; then
  echo "❌ Error: Extension directory not found: $EXTENSION_DIR"
  exit 1
fi

# List essential files
echo "📋 Essential extension files:"
echo "────────────────────────────────────────────────────────────────────────────────"
ls -lh "$EXTENSION_DIR"/*.{js,html,css,json} 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || echo "  No files found"
echo ""

# Count files
FILE_COUNT=$(find "$EXTENSION_DIR" -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" \) ! -name "*.md" | wc -l | tr -d ' ')

echo "✅ Extension files ready!"
echo "📁 Directory: $EXTENSION_DIR"
echo "📊 Total files: $FILE_COUNT"
echo ""
echo "💡 Usage:"
echo "   1. In Chrome, go to chrome://extensions/"
echo "   2. Enable 'Developer mode'"
echo "   3. Click 'Load unpacked'"
echo "   4. Select the 'extension' folder: $EXTENSION_DIR"
echo ""

