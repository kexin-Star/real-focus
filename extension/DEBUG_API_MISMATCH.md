# API 结果不一致问题排查

## 问题描述

本地测试显示 70% 相关性，Stay 状态，但扩展显示 10% 相关性，Block 状态。

## 可能的原因

### 1. API URL 不同 ⚠️ **已修复**

**问题**：
- 扩展使用：`https://real-focus-a79c571mm-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant`
- 测试脚本使用：`https://real-focus-32cpqcsg8-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant`

**修复**：
- ✅ 已更新扩展的 API URL 为最新版本

### 2. 缓存问题 ⚠️ **需要检查**

**问题**：
- 扩展使用了缓存，可能缓存了旧的结果（10%, Block）
- 缓存可能来自旧版本的 API

**解决方案**：
1. **清除扩展缓存**：
   - 打开 Background Script Console (`chrome://extensions/` → 点击 service worker)
   - 运行：
   ```javascript
   chrome.storage.local.clear(() => {
     console.log('Cache cleared');
   });
   ```

2. **或者重新加载扩展**：
   - 在 `chrome://extensions/` 页面
   - 点击"重新加载"按钮

### 3. content_snippet 缺失 ⚠️ **需要检查**

**问题**：
- 如果 content script 没有正确提取内容，`content_snippet` 可能为空
- 这会导致 API 判断不准确

**检查方法**：
1. 打开 Background Script Console
2. 查看日志中的 `Content extracted:` 和 `Calling API with:`
3. 确认 `contentSnippetLength` 是否大于 0

### 4. 参数传递问题 ⚠️ **已修复**

**问题**：
- 扩展可能没有正确传递 `content_snippet` 给 API

**修复**：
- ✅ 已添加详细的日志记录
- ✅ 确保正确传递 `content_snippet`

## 调试步骤

### 步骤 1：清除缓存并重新加载扩展

1. **清除缓存**：
   ```javascript
   // 在 Background Script Console 中运行
   chrome.storage.local.clear(() => {
     console.log('Cache cleared');
   });
   ```

2. **重新加载扩展**：
   - `chrome://extensions/` → 点击"重新加载"

### 步骤 2：检查 API 调用

1. **打开 Background Script Console**
   - `chrome://extensions/` → 点击 service worker 链接

2. **访问测试页面**
   - `https://vercel.com/docs/cli/build`

3. **查看日志**：
   - 应该看到：
     ```
     Calling API with: { keywords: '...', title: '...', url: '...', hasContentSnippet: true, contentSnippetLength: ... }
     API Response: { relevance_score_percent: 70, status: 'Stay', ... }
     ```

4. **对比结果**：
   - 如果 API 响应是 70%, Stay，但 UI 显示 10%, Block
   - 问题可能在 popup.js 的数据处理逻辑

### 步骤 3：检查 popup.js 数据处理

1. **打开扩展 popup**
2. **打开 popup 的开发者工具**（右键点击 popup → 检查）
3. **查看 Console 日志**
4. **检查 `checkSiteRelevance` 函数的响应处理**

## 验证修复

### 测试用例

- **Keywords**: `我在用cursor vibecoding做一个google extension用来帮助用户正常使用浏览器查询学习内容的同时保持专注`
- **URL**: `https://vercel.com/docs/cli/build`
- **预期结果**: 70% 相关性，Stay 状态

### 验证步骤

1. **清除缓存**
2. **重新加载扩展**
3. **访问测试页面**
4. **检查 Background Script Console 日志**
5. **检查 popup 显示的结果**

## 如果问题仍然存在

### 检查点 1：API URL 是否正确

在 Background Script Console 中检查：
```javascript
// 应该显示最新的 API URL
console.log('API URL:', 'https://real-focus-32cpqcsg8-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant');
```

### 检查点 2：缓存是否已清除

```javascript
// 检查缓存
chrome.storage.local.get(['aiCache'], (result) => {
  console.log('Cache:', result);
});
```

### 检查点 3：content_snippet 是否正确传递

查看日志中的 `hasContentSnippet` 和 `contentSnippetLength`：
- 如果 `hasContentSnippet: false`，说明 content script 没有提取到内容
- 这可能导致 API 判断不准确

### 检查点 4：API 响应是否正确

查看日志中的 `API Response`：
- 如果 API 返回 70%, Stay，但 UI 显示 10%, Block
- 问题在 popup.js 的数据处理或显示逻辑

## 相关文件

- `extension/background.js` - API 调用逻辑（已更新 API URL）
- `extension/popup.js` - UI 显示逻辑
- `extension/content.js` - 内容提取逻辑

