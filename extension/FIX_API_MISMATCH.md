# 修复 API 结果不一致问题

## 问题总结

**现象**：
- 本地测试：70% 相关性，Stay 状态 ✅
- 扩展显示：10% 相关性，Block 状态 ❌

## 已修复的问题

### 1. ✅ API URL 已更新

**修复前**：
```javascript
const apiUrl = 'https://real-focus-a79c571mm-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant';
```

**修复后**：
```javascript
const apiUrl = 'https://real-focus-32cpqcsg8-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant';
```

### 2. ✅ 添加了详细的调试日志

现在 Background Script 会记录：
- API 调用参数（keywords, title, url, content_snippet）
- API 响应结果（score, status, reason）

## 需要手动操作

### 步骤 1：清除扩展缓存

1. **打开 Background Script Console**
   - 访问 `chrome://extensions/`
   - 找到 Real Focus Assistant 扩展
   - 点击 "service worker" 或 "检查视图" 链接

2. **清除缓存**
   ```javascript
   chrome.storage.local.clear(() => {
     console.log('✅ Cache cleared');
   });
   ```

### 步骤 2：重新加载扩展

1. 在 `chrome://extensions/` 页面
2. 点击扩展卡片上的"重新加载"按钮（🔄）
3. 或者移除扩展后重新加载

### 步骤 3：测试验证

1. **打开扩展 popup**
2. **设置专注主题**：
   - `我在用cursor vibecoding做一个google extension用来帮助用户正常使用浏览器查询学习内容的同时保持专注`

3. **访问测试页面**：
   - `https://vercel.com/docs/cli/build`

4. **检查结果**：
   - 应该显示：70% 相关性，Stay 状态
   - 如果仍然显示 10%, Block，继续下一步

### 步骤 4：检查日志

1. **打开 Background Script Console**
2. **查看日志**，应该看到：
   ```
   Calling API with: {
     keywords: '...',
     title: '...',
     url: 'https://vercel.com/docs/cli/build',
     hasContentSnippet: true,
     contentSnippetLength: ...
   }
   API Response: {
     relevance_score_percent: 70,
     status: 'Stay',
     reason: '...'
   }
   ```

3. **如果 API 响应是 70%, Stay，但 UI 显示 10%, Block**：
   - 问题在 popup.js 的数据处理
   - 检查 popup 的 Console 日志

## 可能的原因

### 原因 1：缓存了旧结果 ⚠️ **最可能**

**症状**：
- 扩展显示 10%, Block（旧结果）
- Background Script Console 显示 "Cache hit"

**解决方案**：
- 清除缓存（见步骤 1）

### 原因 2：content_snippet 缺失

**症状**：
- Background Script Console 显示 `hasContentSnippet: false`
- 或 `contentSnippetLength: 0`

**影响**：
- API 可能无法准确判断相关性
- 导致分数偏低

**解决方案**：
- 检查 content script 是否正确加载
- 检查页面是否允许 content script 运行

### 原因 3：API URL 指向旧版本

**症状**：
- Background Script Console 显示旧的 API URL

**解决方案**：
- ✅ 已修复：API URL 已更新为最新版本
- 重新加载扩展以应用更改

## 快速修复命令

在 Background Script Console 中运行：

```javascript
// 1. 清除缓存
chrome.storage.local.clear(() => {
  console.log('✅ Cache cleared');
  
  // 2. 验证 API URL
  console.log('API URL should be: https://real-focus-32cpqcsg8-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant');
});
```

## 验证修复

修复后，访问 `https://vercel.com/docs/cli/build` 应该显示：
- ✅ 相关性：70%
- ✅ 状态：Stay
- ✅ 与本地测试结果一致

## 如果问题仍然存在

1. **检查 Background Script Console 日志**
   - 确认 API URL 是否正确
   - 确认 API 响应是什么

2. **检查 popup Console 日志**
   - 右键点击 popup → 检查
   - 查看 `checkSiteRelevance` 的响应处理

3. **对比测试脚本和扩展的参数**
   - 确认 keywords、title、url 是否相同
   - 确认 content_snippet 是否传递

