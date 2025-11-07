# 本地测试指南

## 为什么需要本地测试？

本地测试可以让你：
- ✅ **快速迭代**：修改代码后立即测试，无需等待部署
- ✅ **节省时间**：不需要每次 push 和等待 Vercel 部署（通常 1-3 分钟）
- ✅ **节省成本**：本地测试不会消耗 Vercel 的构建配额
- ✅ **调试方便**：可以直接查看本地日志和错误信息

## 本地测试步骤

### 1. 启动本地开发服务器

在项目根目录运行：

```bash
npm run dev
```

或者直接使用：

```bash
vercel dev
```

这会在 `http://localhost:3000` 启动本地服务器。

### 2. 运行测试（使用本地 API）

在**另一个终端窗口**中运行：

```bash
LOCAL_TEST=true node test-hybrid-strategy.js
```

或者使用 npm script（如果添加了的话）：

```bash
LOCAL_TEST=true npm test
```

### 3. 测试生产环境 API（可选）

如果想测试已部署的 API，直接运行：

```bash
node test-hybrid-strategy.js
```

## 环境变量设置

确保 `.env.local` 文件包含：

```env
OPENAI_API_KEY=your-api-key-here
```

本地开发服务器会自动读取 `.env.local` 文件。

## 工作流程建议

### 开发阶段（本地测试）
1. 修改代码
2. 运行 `npm run dev`（如果还没运行）
3. 运行 `LOCAL_TEST=true node test-hybrid-strategy.js`
4. 查看结果，继续修改
5. 重复步骤 1-4

### 部署阶段（生产测试）
1. 确认本地测试通过
2. `git add`, `git commit`, `git push`
3. 等待 Vercel 自动部署（1-3 分钟）
4. 运行 `node test-hybrid-strategy.js` 测试生产环境

## 常见问题

### Q: 本地测试时出现 "Connection refused" 错误
**A:** 确保已经运行了 `npm run dev` 或 `vercel dev`

### Q: 本地测试时 API 返回 500 错误
**A:** 检查 `.env.local` 文件是否包含正确的 `OPENAI_API_KEY`

### Q: 如何同时运行本地服务器和测试？
**A:** 使用两个终端窗口：
- 终端 1: `npm run dev`（保持运行）
- 终端 2: `LOCAL_TEST=true node test-hybrid-strategy.js`

### Q: 本地测试和部署测试有什么区别？
**A:** 
- 本地测试：使用本地代码，快速迭代
- 部署测试：使用生产环境代码，验证最终效果

## 提示

- 开发时优先使用本地测试，快速验证功能
- 部署前进行本地测试，确保代码正确
- 部署后进行一次生产环境测试，确认部署成功


