# 本地测试设置指南

## ✅ 快速开始（推荐方法）

### 步骤 1：启动本地服务器

**在终端 1 中运行：**
```bash
npm run local
```

你会看到：
```
🚀 Local Development Server
✅ Server running on http://localhost:3000
📡 API endpoint: http://localhost:3000/api/focus-assistant
🔑 Using OPENAI_API_KEY: ✅ Set
```

**保持这个终端窗口打开！**

### 步骤 2：运行测试

**在终端 2 中运行：**
```bash
npm run test:local
```

测试会自动连接到本地服务器并运行。

## 其他方法

### 方法 1：使用 Vercel Dev（需要修复 Dashboard 设置）

如果 `vercel dev` 正常工作，可以使用：

**在终端 1：**
```bash
vercel dev
```

**在终端 2：**
```bash
npm run test:local
```

**注意：** 如果遇到 "Running Dev Command" 错误，需要在 Vercel Dashboard 中清空 Development Command 字段（见下方说明）。

### 方法 2：修复 Vercel Dashboard 设置（永久解决 vercel dev 问题）

1. **访问 Vercel Dashboard**
   - 打开 https://vercel.com/dashboard
   - 找到项目 `real-focus`

2. **清空 Development Command**
   - 进入 **Settings** → **General** → **Framework Settings**
   - 找到 **Development Command** 字段
   - **完全清空**该字段（留空，不是 "None"）
   - 确保 **Override** 开关是**关闭**状态
   - 点击 **Save** 保存

3. **验证修复**
   ```bash
   vercel dev
   ```
   应该看到：
   ```
   Ready! Available at http://localhost:3000
   ```

## 验证服务器是否运行

```bash
# 检查端口
lsof -ti:3000

# 测试 API
curl http://localhost:3000/api/focus-assistant \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"keywords":"test","title":"Test","url":"https://example.com"}'
```

## 常见问题

### Q: `vercel dev` 卡在 "Running Dev Command"
**A:** 需要在 Vercel Dashboard 中清空 Development Command 字段

### Q: 端口 3000 被占用
**A:** 使用其他端口：
```bash
vercel dev --listen 3001
```
然后修改测试脚本中的端口号

### Q: 连接被拒绝
**A:** 确保开发服务器已经完全启动（看到 "Ready!" 消息）

## 提示

- 开发时优先使用本地测试，快速验证功能
- 修改代码后，Vercel dev 会自动重新加载
- 确保 `.env.local` 文件包含 `OPENAI_API_KEY`

