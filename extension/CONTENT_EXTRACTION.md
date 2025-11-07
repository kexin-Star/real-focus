# 内容抓取与预处理实现说明

## 概述

在 `content.js` 中实现了增强的内容抓取能力，提取页面的关键信息并预处理为 500 字符以内的摘要，以降低 API Token 成本并提高分析准确度。

## 实现功能

### 1. 内容提取 (`extractPageContent`)

提取以下关键信息：
- **`<title>`**: 页面标题
- **`<h1>`**: 主标题
- **`<meta name="description">`**: Meta 描述
- **`content_snippet`**: 预处理后的内容摘要（最多 500 字符）

### 2. 内容摘要提取 (`extractContentSnippet`)

按优先级提取内容摘要：

1. **优先级 1**: Meta description（如果存在且 ≤ 500 字符）
2. **优先级 2**: H1 标题（如果存在且 ≤ 500 字符）
3. **优先级 3**: 第一个有意义的段落（长度 > 20 字符）
4. **优先级 4**: 页面标题
5. **后备方案**: 页面可见文本

### 3. 文本预处理 (`preprocessText`)

对提取的文本进行以下处理：
- ✅ 移除多余空白和换行符
- ✅ 保留中文字符、英文、数字和基本标点
- ✅ 规范化空格
- ✅ 截断到 500 字符（尽量在词边界截断）
- ✅ 添加省略号（如果被截断）

### 4. 消息传递

Content Script 监听 `extractContent` 消息：
```javascript
chrome.runtime.sendMessage({ action: 'extractContent' })
```

返回格式：
```javascript
{
  success: true,
  content: {
    title: "页面标题",
    h1: "主标题",
    description: "Meta 描述",
    content_snippet: "预处理后的内容摘要（≤500字符）",
    combined_content: "Title: ... | Heading: ... | Description: ... | Content: ..."
  }
}
```

## 集成流程

### 完整工作流程

```
1. popup.js 检测到需要分析网站
   ↓
2. 发送消息到 background.js (包含 tabId)
   ↓
3. background.js 检查缓存
   ├─ 缓存命中 → 返回缓存结果
   └─ 缓存未命中
       ↓
4. background.js 通过 tabId 发送消息到 content.js
   ↓
5. content.js 提取页面内容
   - 提取 title, h1, meta description
   - 生成 content_snippet (≤500字符)
   ↓
6. content.js 返回提取的内容
   ↓
7. background.js 使用提取的内容调用 API
   - 增强 title: "title | content_snippet(前200字符)"
   ↓
8. 存储结果到缓存
   ↓
9. 返回结果给 popup.js
```

## Token 成本优化

### 优化前
- 只使用 `tab.title` 和 `url`
- 信息有限，可能影响准确度

### 优化后
- 使用提取的 `title`, `h1`, `description`
- 添加 `content_snippet`（最多 500 字符，实际发送前 200 字符）
- **成本控制**: 限制在 500 字符以内，实际 API 调用时只使用前 200 字符
- **准确度提升**: 提供更多上下文信息

### 示例

**优化前**:
```json
{
  "keywords": "design, figma",
  "title": "Figma Design",
  "url": "https://www.figma.com"
}
```

**优化后**:
```json
{
  "keywords": "design, figma",
  "title": "Figma Design | Create and collaborate on designs with Figma. Build better products as a team. Design, prototype, and gather feedback all in one place...",
  "url": "https://www.figma.com"
}
```

## 代码结构

### content.js
- `extractPageContent()` - 提取页面关键信息
- `extractContentSnippet()` - 提取内容摘要（优先级策略）
- `preprocessText()` - 文本预处理和截断
- `getPageContent()` - 获取完整内容信息

### background.js
- `extractContentFromTab(tabId)` - 从标签页提取内容
- `callAIAPI()` - 使用提取的内容调用 API

### popup.js
- 传递 `tabId` 给 background.js

## 配置参数

```javascript
const MAX_SNIPPET_LENGTH = 500;  // 内容摘要最大长度
const API_SNIPPET_LENGTH = 200;   // 实际发送给 API 的长度（在 background.js 中）
```

## 优势

1. **降低 Token 成本**: 只发送关键信息，限制在 500 字符以内
2. **提高准确度**: 提供更多上下文（title, h1, description, content）
3. **智能提取**: 优先级策略确保获取最有价值的信息
4. **自动预处理**: 清理和规范化文本，提高质量
5. **容错处理**: 如果 content script 不可用，回退到使用 tab.title

## 注意事项

1. **Content Script 注入**: 确保 manifest.json 中配置了 content scripts
2. **跨域限制**: 某些页面可能无法注入 content script（如 chrome:// 页面）
3. **性能**: 内容提取是同步操作，但很快（< 50ms）
4. **字符限制**: 严格限制在 500 字符以内，避免超出 Token 预算

## 测试建议

1. 测试不同网站的内容提取
2. 验证 500 字符限制是否生效
3. 检查 API 调用中的 title 是否包含 content_snippet
4. 测试没有 content script 的页面（应回退到 tab.title）


