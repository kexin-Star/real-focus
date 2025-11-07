#!/bin/bash

# Test script for Chrome Extension

echo "🧪 Real Focus Assistant Extension - Test Checklist"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check required files
echo "📋 Checking required files..."

required_files=(
  "manifest.json"
  "popup.html"
  "popup.css"
  "popup.js"
  "background.js"
  "content.js"
)

missing_files=()

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (MISSING)"
    missing_files+=("$file")
  fi
done

echo ""

if [ ${#missing_files[@]} -gt 0 ]; then
  echo "❌ Missing files: ${missing_files[*]}"
  exit 1
fi

# Check manifest.json syntax
echo "🔍 Validating manifest.json..."
if command -v node &> /dev/null; then
  node -e "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')); console.log('✅ manifest.json is valid JSON')" 2>/dev/null || echo "❌ manifest.json has syntax errors"
else
  echo "⚠️  Node.js not found, skipping JSON validation"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Extension is ready for testing!"
echo ""
echo "📝 Next steps:"
echo "1. Open Chrome and go to: chrome://extensions/"
echo "2. Enable 'Developer mode' (top right)"
echo "3. Click 'Load unpacked'"
echo "4. Select this directory: $(pwd)"
echo ""
echo "🧪 Testing checklist:"
echo "  □ Extension loads without errors"
echo "  □ Click extension icon to open popup"
echo "  □ Input keywords and click 'Start Focus'"
echo "  □ Verify state switches to focused view"
echo "  □ Check timer is working"
echo "  □ Verify API calls are made (check Network tab)"
echo "  □ Check cache is working (revisit same URL)"
echo "  □ Test content extraction (check console logs)"
echo ""

