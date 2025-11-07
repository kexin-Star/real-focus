# 本地测试检查清单

## 步骤 1: 本地服务器已启动 ✅

本地 API 服务器运行在: `http://localhost:3000/api/focus-assistant`

## 步骤 2: Extension 已配置为使用本地 API ✅

`extension/background.js` 中的 `apiUrl` 已设置为: `http://localhost:3000/api/focus-assistant`

## 步骤 3: 重新加载 Extension

1. 打开 Chrome: `chrome://extensions/`
2. 找到 "Real Focus Assistant"
3. 点击 **"重新加载"** 按钮（🔄）
4. 确认 Extension 已重新加载

## 步骤 4: 测试工具链关键词检测

### 测试用例 1: Vercel 错误文档
- **URL**: `https://vercel.com/docs/errors/error-list#recursive-invocation-of-commands`
- **专注主题**: `我在用cursor vibecoding做一个google extension用来帮助用户正常使用浏览器查询学习内容的同时保持专注`
- **预期结果**: 
  - 应该检测到工具链关键词（vercel, docs, error）
  - 语义分数应该被强制提升（如果 <= 35）
  - 应该进入 GPT 分析
  - 最终分数应该在 70-85% 之间

### 测试用例 2: Gemini AI 工具
- **URL**: `https://gemini.google.com/app/fbb32d5518bd52b6`
- **专注主题**: 同上
- **预期结果**: 
  - 应该检测到工具链关键词（gemini, google）
  - 应该进入 GPT 分析
  - 最终分数应该在 70-85% 之间

### 测试用例 3: 普通社交页面（验证 Fast Block 仍然工作）
- **URL**: `https://www.xiaohongshu.com/explore/123`
- **专注主题**: 同上
- **预期结果**: 
  - 不应该检测到工具链关键词
  - 如果语义分数 <= 20，应该 Fast Block
  - 最终分数应该是 15%

## 步骤 5: 查看日志

### Background Script Console
1. 在 `chrome://extensions/` 中，点击 Extension 的 **"service worker"** 链接
2. 查看 Console 日志，查找：
   - `🔧 Toolchain keyword detected in URL/Title/Content`
   - `Original semantic score: X, forcing to 40 to skip Fast Block`
   - `Semantic score updated to: 40 (will trigger GPT deep analysis)`

### 本地服务器日志
```bash
tail -f /tmp/local-server.log
```

查找：
- `Toolchain keyword detected in URL/Title/Content`
- `Semantic score updated to: 40`

## 步骤 6: 验证结果

### ✅ 成功标志
- Vercel/Gemini 等工具链页面不再被 Fast Block
- 工具链页面进入 GPT 分析
- 工具链页面最终分数在 70-85% 之间
- 普通页面仍然正常 Fast Block

### ❌ 如果失败
- 检查本地服务器是否正常运行
- 检查 Extension 是否正确重新加载
- 查看 Console 日志中的错误信息
- 确认 API URL 是否正确设置为 localhost

## 步骤 7: 测试完成后

### 恢复 Extension 配置
修改 `extension/background.js`，将 `apiUrl` 改回部署的 URL：
```javascript
const apiUrl = 'https://real-focus-32cpqcsg8-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant';
```

### 提交并部署
```bash
git add api/focus-assistant.js
git commit -m "添加工具链关键词检测，确保在 Fast Block 之前执行"
git push origin main
```

### 等待 Vercel 部署
- 通常需要 1-2 分钟
- 可以在 Vercel Dashboard 查看部署状态
- 部署完成后，Extension 会自动使用新的 API（无需 reload）

