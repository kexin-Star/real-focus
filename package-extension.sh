#!/bin/bash

# Package Chrome Extension (without compression)
# This script creates a zip file with all extension files stored (not compressed)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_DIR="$SCRIPT_DIR/extension"
OUTPUT_FILE="$SCRIPT_DIR/extension.zip"

echo "📦 Packaging Chrome Extension (no compression)..."
echo "Extension directory: $EXTENSION_DIR"
echo "Output file: $OUTPUT_FILE"
echo ""

# Remove existing zip file if it exists
if [ -f "$OUTPUT_FILE" ]; then
  echo "Removing existing $OUTPUT_FILE..."
  rm -f "$OUTPUT_FILE"
fi

# Create zip file with storage mode (no compression)
# -0: Store files without compression
# -r: Recursive
# -x: Exclude patterns
cd "$SCRIPT_DIR"
zip -0 -r extension.zip extension/ \
  -x "*.DS_Store" \
  -x "*.git*" \
  -x "*test-extension.sh" \
  -x "*.md" \
  -x "*.zip"

echo ""
echo "✅ Extension packaged successfully!"
echo "📁 Output: $OUTPUT_FILE"
echo "📊 File size: $(ls -lh "$OUTPUT_FILE" | awk '{print $5}')"
echo ""
echo "📋 Contents:"
unzip -l "$OUTPUT_FILE" | tail -n +4 | grep -v "^--" | grep -v "Archive:"

