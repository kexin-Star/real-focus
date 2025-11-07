# 快速开始 - 本地测试

## 步骤 1：启动本地服务器

在一个终端窗口中运行：

```bash
npm run dev
```

你会看到类似这样的输出：
```
> real-focus@1.0.0 dev
> vercel dev

Vercel CLI 28.x.x
...
Ready! Available at http://localhost:3000
```

**保持这个终端窗口打开！**

## 步骤 2：运行测试

在**另一个终端窗口**中运行：

```bash
npm run test:local
```

或者：

```bash
LOCAL_TEST=true node test-hybrid-strategy.js
```

## 完整示例

```bash
# 终端 1
$ npm run dev
> Ready! Available at http://localhost:3000

# 终端 2（新开一个终端）
$ npm run test:local
🔧 Using LOCAL API (http://localhost:3000)
...
```

## 提示

- 确保 `.env.local` 文件包含 `OPENAI_API_KEY`
- 如果端口 3000 被占用，Vercel 会自动使用其他端口（如 3001）
- 修改代码后，Vercel dev 会自动重新加载，无需重启


