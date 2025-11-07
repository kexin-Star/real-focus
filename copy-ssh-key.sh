#!/bin/bash

# 显示 SSH public key 并复制到剪贴板

echo "📋 你的 SSH Public Key:"
echo ""
cat ~/.ssh/id_ed25519.pub
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 尝试复制到剪贴板（macOS）
if command -v pbcopy &> /dev/null; then
    cat ~/.ssh/id_ed25519.pub | pbcopy
    echo "✅ SSH key 已复制到剪贴板！"
    echo ""
    echo "📝 下一步："
    echo "1. 访问: https://github.com/settings/keys"
    echo "2. 点击 'New SSH key'"
    echo "3. Title: 输入 'Mac - real-focus'（或任意描述）"
    echo "4. Key: 按 Cmd+V 粘贴"
    echo "5. 点击 'Add SSH key'"
    echo ""
    echo "完成后运行: git push -u origin main"
else
    echo "⚠️  无法自动复制，请手动复制上面的 key"
fi

