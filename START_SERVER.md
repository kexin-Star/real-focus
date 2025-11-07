# 启动本地开发服务器

## 问题

后台启动 `npm run dev` 可能因为需要交互式输入而失败。

## 解决方案

### 方法 1：手动启动（推荐）

**在终端 1 中运行：**

```bash
npm run dev
```

或者：

```bash
vercel dev
```

**保持这个终端窗口打开！**

你会看到类似输出：
```
Vercel CLI 48.8.2
...
Ready! Available at http://localhost:3000
```

### 方法 2：检查是否有错误

如果启动失败，查看终端输出中的错误信息。常见问题：

1. **需要登录 Vercel：**
   ```bash
   vercel login
   ```

2. **端口被占用：**
   ```bash
   lsof -ti:3000  # 查看占用端口的进程
   # 或者使用其他端口
   vercel dev -p 3001
   ```

3. **环境变量缺失：**
   确保 `.env.local` 文件存在并包含 `OPENAI_API_KEY`

### 方法 3：使用两个终端窗口

**终端 1（服务器）：**
```bash
npm run dev
# 保持运行，不要关闭
```

**终端 2（测试）：**
```bash
npm run test:local
```

## 验证服务器是否运行

运行以下命令检查：

```bash
lsof -ti:3000
```

如果有输出（显示进程 ID），说明服务器正在运行。

或者：

```bash
curl http://localhost:3000/api/focus-assistant \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"keywords":"test","title":"Test","url":"https://example.com"}'
```

如果返回 JSON 响应，说明服务器正常工作。

