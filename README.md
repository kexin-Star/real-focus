# AI Focus Assistant - Vercel Serverless Function

这是一个用于 Vercel 的 Serverless Function 骨架项目。

## 项目结构

```
ai-focus/
├── api/
│   └── focus-assistant.js    # Vercel Serverless Function
├── package.json               # 项目依赖
└── README.md                  # 项目说明
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

## API 端点

### POST `/api/focus-assistant`

**请求体：**
```json
{
  "keywords": "关键词1, 关键词2",
  "title": "页面标题",
  "url": "https://example.com"
}
```

**响应：**
```json
{
  "status": "received",
  "data": {
    "keywords": "关键词1, 关键词2",
    "title": "页面标题",
    "url": "https://example.com"
  }
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


