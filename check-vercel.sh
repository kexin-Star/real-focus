#!/bin/bash

echo "=== 检查 Vercel 部署状态 ===\n"

# 检查本地开发服务器
echo "1. 检查本地开发服务器 (端口 3000):"
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "   ✅ 本地开发服务器正在运行"
    echo "   🌐 访问: http://localhost:3000/api/focus-assistant"
else
    echo "   ❌ 本地开发服务器未运行"
    echo "   💡 运行 'vercel dev' 启动本地服务器"
fi

echo ""

# 检查 Vercel CLI 是否安装
echo "2. 检查 Vercel CLI:"
if command -v vercel &> /dev/null; then
    echo "   ✅ Vercel CLI 已安装"
    vercel_version=$(vercel --version 2>/dev/null || echo "unknown")
    echo "   版本: $vercel_version"
else
    echo "   ❌ Vercel CLI 未安装"
    echo "   💡 运行 'npm install -g vercel' 安装"
fi

echo ""

# 检查 .vercel 目录（项目是否已链接）
echo "3. 检查项目链接状态:"
if [ -d ".vercel" ]; then
    echo "   ✅ 项目已链接到 Vercel"
    if [ -f ".vercel/project.json" ]; then
        echo "   项目信息:"
        cat .vercel/project.json 2>/dev/null | grep -E "(name|id)" || echo "   无法读取项目详情"
    fi
else
    echo "   ❌ 项目未链接到 Vercel"
    echo "   💡 运行 'vercel' 或 'vercel link' 链接项目"
fi

echo ""

# 测试 API 端点（如果本地服务器运行中）
echo "4. 测试 API 端点:"
if lsof -ti:3000 > /dev/null 2>&1; then
    response=$(curl -s -X POST http://localhost:3000/api/focus-assistant \
        -H "Content-Type: application/json" \
        -d '{"keywords":"test","title":"Test","url":"https://example.com"}' \
        -w "\nHTTP Status: %{http_code}\n" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo "   ✅ API 响应正常"
        echo "$response" | head -5
    else
        echo "   ❌ API 请求失败"
    fi
else
    echo "   ⏭️  跳过（本地服务器未运行）"
fi

echo ""
echo "=== 检查完成 ==="

