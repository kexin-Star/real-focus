#!/bin/bash

# Test script for focus-assistant API

echo "🧪 Testing Focus Assistant API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test data
KEYWORDS="我正在利用cursor vibe coding做一个帮助stay focus的小插件"
TITLE="小胖da - 小红书"
URL="https://www.xiaohongshu.com/explore/69018b620000000004022c4b?xsec_token=ABJYfL4IHVWPRpgvMYm7wMeuPuVDZm_ctFbhocnE7J7a8=&xsec_source=pc_search&source=unknown"

echo "📋 Test Data:"
echo "  Keywords: $KEYWORDS"
echo "  Title: $TITLE"
echo "  URL: $URL"
echo ""

# Check if local server is running
if lsof -ti:3000 > /dev/null 2>&1; then
    TEST_URL="http://localhost:3000/api/focus-assistant"
    echo "🌐 Testing local server: $TEST_URL"
else
    # Try to get Vercel URL from .vercel directory or use default
    if [ -f ".vercel/project.json" ]; then
        VERCEL_URL=$(cat .vercel/project.json | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
        if [ -n "$VERCEL_URL" ]; then
            TEST_URL="https://$VERCEL_URL/api/focus-assistant"
        else
            TEST_URL="https://real-focus-5osqz3ja5-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant"
        fi
    else
        TEST_URL="https://ai-focus-5osqz3ja5-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant"
    fi
    echo "🌐 Testing Vercel deployment: $TEST_URL"
    echo "   (If local server is running, kill it and restart with 'vercel dev')"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 Sending request..."
echo ""

# Make the API call
RESPONSE=$(curl -s -X POST "$TEST_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"keywords\": \"$KEYWORDS\",
    \"title\": \"$TITLE\",
    \"url\": \"$URL\"
  }" \
  -w "\nHTTP_STATUS:%{http_code}")

# Extract HTTP status and body
HTTP_STATUS=$(echo "$RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "📥 Response:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v jq &> /dev/null; then
    echo "$BODY" | jq .
else
    echo "$BODY"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Test successful!"
else
    echo "❌ Test failed with status $HTTP_STATUS"
fi

