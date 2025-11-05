#!/bin/bash

# GitHub 仓库设置脚本
# 仓库: https://github.com/kexin-Star/real-focus.git

echo "🚀 开始设置 GitHub 仓库..."

# 初始化 Git 仓库
echo "📦 初始化 Git 仓库..."
git init

# 添加所有文件
echo "➕ 添加文件到 Git..."
git add .

# 提交代码
echo "💾 提交代码..."
git commit -m "Initial commit: Vercel Serverless Function with OpenAI integration"

# 设置主分支为 main
echo "🌿 设置主分支..."
git branch -M main

# 添加远程仓库
echo "🔗 添加远程仓库..."
git remote add origin https://github.com/kexin-Star/real-focus.git

# 推送到 GitHub
echo "📤 推送到 GitHub..."
git push -u origin main

echo "✅ 完成！代码已推送到 GitHub"
echo "🔍 查看仓库: https://github.com/kexin-Star/real-focus"

