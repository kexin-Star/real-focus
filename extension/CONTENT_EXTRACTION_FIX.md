# Content Snippet 提取问题修复

## 问题诊断

从日志可以看到：
```
Calling API with: {
  hasContentSnippet: false,
  contentSnippetLength: 0
}
API Response: {
  relevance_score_percent: 15,
  status: 'Block'
}
```

**根本原因**：`content_snippet` 没有提取到，导致 API 只能基于 title 和 URL 判断，导致分数偏低（15% 而不是预期的 70%）。

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

### 2. ✅ 内容提取逻辑改进

**修复内容**：

1. **添加了重试和注入机制** (`background.js`)：
   - 如果 content script 未加载，自动注入
   - 添加等待时间，确保页面加载完成

2. **改进了内容提取选择器** (`content.js`)：
   - 添加了更多内容容器选择器（`main`, `article`, `.content` 等）
   - 改进了段落提取逻辑

3. **添加了页面加载等待** (`content.js`)：
   - 等待 `document.readyState === 'complete'`
   - 添加小延迟确保动态内容渲染完成

### 3. ✅ 添加了详细的调试日志

现在会记录：
- Content extraction 的详细信息
- API 调用的参数
- API 响应的结果

## 修复后的代码

### background.js - extractContentFromTab

```javascript
async function extractContentFromTab(tabId) {
  try {
    // Wait for content script to be ready
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Try to send message
    let response;
    try {
      response = await chrome.tabs.sendMessage(tabId, { action: 'extractContent' });
    } catch (error) {
      // Content script not loaded, inject it
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      await new Promise(resolve => setTimeout(resolve, 300));
      response = await chrome.tabs.sendMessage(tabId, { action: 'extractContent' });
    }
    
    if (response && response.success) {
      return response.content;
    }
  } catch (error) {
    console.warn('Could not extract content:', error);
  }
  return null;
}
```

### content.js - extractContentSnippet

添加了更多内容选择器：
- `main`
- `article`
- `[role="main"]`
- `.content`
- `.main-content`
- `#content`
- `#main`

### content.js - extractContent handler

添加了页面加载等待：
```javascript
// Wait for page to be fully loaded
if (document.readyState !== 'complete') {
  await new Promise(resolve => {
    window.addEventListener('load', resolve, { once: true });
    setTimeout(resolve, 500); // Timeout after 500ms
  });
}
```

## 测试步骤

### 步骤 1：清除缓存并重新加载扩展

1. **清除缓存**（在 Background Script Console）：
   ```javascript
   chrome.storage.local.clear(() => {
     console.log('✅ Cache cleared');
   });
   ```

2. **重新加载扩展**：
   - `chrome://extensions/` → 点击"重新加载"

### 步骤 2：测试内容提取

1. **访问测试页面**：
   - `https://vercel.com/docs/cli/build`

2. **打开扩展 popup**

3. **检查 Background Script Console 日志**：
   - 应该看到：
     ```
     Content extracted: {
       title: '...',
       snippet_length: ...
     }
     Calling API with: {
       hasContentSnippet: true,
       contentSnippetLength: ...
     }
     ```

4. **检查 Content Script Console 日志**（在页面 Console）：
   - 应该看到：
     ```
     Content extracted: {
       title: '...',
       hasSnippet: true,
       snippetLength: ...
     }
     ```

### 步骤 3：验证结果

- **预期结果**：70% 相关性，Stay 状态
- **如果仍然显示 10%, Block**：
  - 检查 `hasContentSnippet` 是否为 `true`
  - 检查 `contentSnippetLength` 是否大于 0
  - 如果仍然为 false/0，说明内容提取失败

## 如果 content_snippet 仍然为空

### 检查点 1：Content Script 是否正确加载

在页面 Console 中检查：
```javascript
// 应该看到
console.log('Real Focus Assistant content script loaded');
```

### 检查点 2：页面结构

某些页面可能：
- 使用 iframe（content script 无法访问）
- 动态加载内容（需要更长的等待时间）
- 使用 Shadow DOM（需要特殊处理）

### 检查点 3：手动测试内容提取

在页面 Console 中运行：
```javascript
// 测试内容提取
function testExtraction() {
  const h1 = document.querySelector('h1')?.textContent;
  const p = document.querySelector('p')?.textContent;
  const main = document.querySelector('main')?.textContent;
  console.log('H1:', h1);
  console.log('P:', p);
  console.log('Main:', main?.substring(0, 100));
}
testExtraction();
```

## 相关文件

- `extension/background.js` - 内容提取调用逻辑（已修复）
- `extension/content.js` - 内容提取实现（已改进）
- `extension/FIX_API_MISMATCH.md` - API 结果不一致问题排查

