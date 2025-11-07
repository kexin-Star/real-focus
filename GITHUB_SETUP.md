# GitHub 仓库设置指南

## 步骤 1: 解决 Xcode 许可证问题（如果尚未解决）

如果你的系统提示需要同意 Xcode 许可证，运行：

```bash
sudo xcodebuild -license
```

然后按照提示同意许可证。

## 步骤 2: 初始化 Git 仓库

```bash
git init
```

## 步骤 3: 配置 Git（如果尚未配置）

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

或者使用全局配置：

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## 步骤 4: 添加文件并提交

```bash
git add .
git commit -m "Initial commit: Vercel Serverless Function with OpenAI integration"
```

## 步骤 5: 在 GitHub 上创建新仓库

1. 访问 [GitHub](https://github.com/new)
2. 仓库名称：`real-focus`（或你喜欢的名称）
3. 选择 **Public** 或 **Private**
4. **不要**勾选 "Initialize this repository with a README"（因为我们已经有了）
5. 点击 **Create repository**

## 步骤 6: 连接本地仓库到 GitHub

GitHub 会显示命令，类似这样：

```bash
git remote add origin https://github.com/YOUR_USERNAME/real-focus.git
git branch -M main
git push -u origin main
```

将 `YOUR_USERNAME` 替换为你的 GitHub 用户名。

## 步骤 7: 在 Vercel 中连接 GitHub

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入你的项目 `real-focus`
3. 进入 **Settings** → **Git**
4. 点击 **Connect Git Repository**
5. 选择你的 GitHub 仓库
6. 完成连接

连接后，每次你推送代码到 GitHub，Vercel 会自动部署！

## 快速命令总结

```bash
# 1. 初始化仓库
git init

# 2. 添加文件
git add .

# 3. 提交
git commit -m "Initial commit: Vercel Serverless Function with OpenAI integration"

# 4. 添加远程仓库（替换 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/real-focus.git

# 5. 设置主分支
git branch -M main

# 6. 推送到 GitHub
git push -u origin main
```

## 后续更新

以后每次修改代码后，只需：

```bash
git add .
git commit -m "描述你的更改"
git push
```

Vercel 会自动检测并部署！

