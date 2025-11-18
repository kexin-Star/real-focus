# Real Focus Assistant

一个 AI 驱动的 Chrome 扩展，帮助用户在浏览网页时保持专注。使用 OpenAI Embeddings 和 GPT-4o-mini 智能分析网页与用户任务的相关性，自动拦截不相关的干扰内容。

## 核心功能

- 🎯 **智能相关性判断**: 使用 OpenAI Embeddings 和 GPT-4o-mini 进行语义分析和深度推理
- ⚡ **混合判断策略**: Fast Pass / Fast Block / Slow Think (GPT) 三层逻辑，平衡性能和准确性
- ⏰ **时间控制**: 在干扰平台上搜索工作内容时，提供 30 秒宽限期
- 🔧 **工具链识别**: 自动识别开发工具和文档页面，避免误伤
- 📦 **缓存机制**: 24 小时缓存，减少 API 调用成本
- 🎨 **Material Design 3 UI**: 现代化的用户界面设计

## 项目结构

```
real-focus/
├── api/
│   └── focus-assistant.js    # Vercel Serverless Function (762 行)
├── extension/                 # Chrome Extension
│   ├── background.js         # Service Worker (1,535 行)
│   ├── content.js            # Content Script (923 行)
│   ├── popup.js              # Popup 主入口 (787 行)
│   ├── ui-manager.js         # UI 管理模块 (657 行)
│   ├── event-handlers.js     # 事件处理模块 (417 行)
│   ├── storage-utils.js      # 存储工具模块 (94 行)
│   ├── time-utils.js         # 时间工具模块 (77 行)
│   ├── popup.html            # Popup HTML (195 行)
│   ├── popup.css             # Popup 样式 (842 行)
│   └── manifest.json         # Extension 配置
├── test-hybrid-strategy.js   # 交互式测试工具
├── test-openai-key.js        # API Key 测试工具
├── local-server.js           # 本地测试服务器
├── package.json              # 项目依赖
└── vercel.json               # Vercel 配置
```

## 安装依赖

```bash
npm install
```

## 本地开发

使用 Vercel CLI 进行本地开发：

```bash
npm install -g vercel
vercel dev
```

## 环境变量配置

### 在 Vercel 上设置环境变量

1. **通过 Vercel Dashboard：**
   - 登录 [Vercel Dashboard](https://vercel.com/dashboard)
   - 选择你的项目
   - 进入 **Settings** → **Environment Variables**
   - 添加以下环境变量：
     - **Name**: `OPENAI_API_KEY`
     - **Value**: `你的 OpenAI API Key`
     - 选择应用环境（Production, Preview, Development）

2. **通过 Vercel CLI：**
   ```bash
   vercel env add OPENAI_API_KEY
   ```
   然后输入你的 API Key 值。

3. **通过 `vercel.json` 配置：**
   在项目根目录创建 `vercel.json` 文件（可选）：
   ```json
   {
     "env": {
       "OPENAI_API_KEY": "@openai_api_key"
     }
   }
   ```

### 本地测试环境变量

在项目根目录创建 `.env.local` 文件：

```env
OPENAI_API_KEY=sk-your-api-key-here
```

**注意：** `.env.local` 文件已添加到 `.gitignore`，不会被提交到 Git。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
OPENAI_API_KEY=sk-your-api-key-here
```

### 3. 本地开发

启动本地服务器：

```bash
npm run local
# 或
node local-server.js
```

### 4. 加载 Chrome Extension

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的 `extension/` 文件夹

### 5. 测试

运行交互式测试：

```bash
npm test
# 或
npm run test:local  # 使用本地 API
```

## API 端点

### POST `/api/focus-assistant`

**请求体：**
```json
{
  "keywords": "用户专注主题",
  "title": "页面标题",
  "url": "https://example.com",
  "content_snippet": "页面内容摘要（可选）"
}
```

**响应：**
```json
{
  "relevance_score_percent": 85,
  "status": "Stay",
  "reason": "This page is relevant to your focus topic",
  "requires_time_control": false
}
```

## 部署

```bash
vercel
```

或通过 GitHub 集成自动部署。

## 如何验证 Vercel 部署状态

### 方法 1：使用检查脚本（快速）

运行项目根目录的检查脚本：

```bash
./check-vercel.sh
```

这个脚本会检查：
- ✅ 本地开发服务器是否运行
- ✅ Vercel CLI 是否安装
- ✅ 项目是否已链接到 Vercel
- ✅ API 端点是否正常工作

### 方法 2：手动检查本地开发服务器

1. **检查端口是否被占用：**
   ```bash
   lsof -ti:3000
   ```
   如果有输出，说明本地服务器正在运行。

2. **测试 API 端点：**
   ```bash
   curl -X POST http://localhost:3000/api/focus-assistant \
     -H "Content-Type: application/json" \
     -d '{"keywords":"test","title":"Test","url":"https://example.com"}'
   ```
   如果返回 JSON 响应（包含 `status: "received"`），说明本地部署成功。

3. **检查 Vercel CLI 状态：**
   ```bash
   vercel --version
   vercel whoami
   ```
   - `vercel --version` 显示版本号
   - `vercel whoami` 显示当前登录的用户

### 方法 3：检查生产环境部署

1. **通过 Vercel Dashboard：**
   - 访问 [Vercel Dashboard](https://vercel.com/dashboard)
   - 查看项目列表，找到你的项目
   - 点击项目查看部署状态和 URL

2. **通过 Vercel CLI：**
   ```bash
   vercel ls          # 列出所有部署
   vercel inspect     # 检查最新部署的详细信息
   ```

3. **测试生产 API：**
   部署成功后，Vercel 会提供一个 URL，例如：
   ```
   https://your-project.vercel.app/api/focus-assistant
   ```
   你可以用 curl 或浏览器测试这个端点。

### 方法 4：检查项目链接状态

```bash
ls -la .vercel
```

如果存在 `.vercel` 目录，说明项目已链接到 Vercel。

### 常见问题排查

| 问题 | 解决方法 |
|------|---------|
| `vercel: command not found` | 运行 `npm install -g vercel` |
| 端口 3000 已被占用 | 使用 `vercel dev -p 3001` 指定其他端口 |
| API 返回 404 | 确认文件路径为 `api/focus-assistant.js` |
| 环境变量未生效 | 检查 `.env.local` 文件或 Vercel Dashboard 中的环境变量设置 |


