# Google 搜索结果页 (SERP) 内容提取修复

## 问题描述

Google 搜索结果页的内容提取存在以下问题：
1. **H1 标签干扰**: Google SERP 的 `<h1>` 标签通常是 "Accessibility Links"，不是有用的内容
2. **搜索结果未提取**: 没有专门针对 Google 搜索结果的提取逻辑
3. **内容质量低**: 提取的内容不包含实际的搜索结果摘要

## 修复方案

### 1. Google SERP 检测

在内容提取逻辑的最前端，检测是否为 Google 搜索结果页：

```javascript
const isGoogleSERP = window.location.hostname.includes('google.com') && 
                      window.location.pathname.includes('/search');
```

### 2. 跳过 H1 标签

对于 Google SERP，跳过 `<h1>` 标签的提取：
- 在 `extractPageContent()` 中：不提取 H1
- 在 `extractContentSnippet()` 中：跳过 H1 优先级

### 3. 搜索结果提取逻辑

#### 3.1 搜索结果容器选择器

尝试多种 Google 搜索结果的选择器：
- `.g` - Classic Google results
- `.rc` - Rich results
- `.tF2Cxc` - Modern Google results
- `[data-ved]` - Results with data-ved attribute

#### 3.2 标题提取

从每个搜索结果中提取标题：
- 优先选择 `<h3>` 标签
- 备选：`<a[href]>` 标签

#### 3.3 摘要提取

从每个搜索结果中提取摘要：
- `.VwiC3b` - Modern snippet class
- `.s` - Classic snippet class
- `.IsZvec` - Alternative snippet class
- `span[style*="line-height"]` - Fallback
- `div[style*="line-height"]` - Fallback

#### 3.4 结果组合

- 提取前 3-5 个搜索结果
- 每个结果格式：`标题. 摘要`
- 多个结果用 ` | ` 分隔

### 4. 优先级调整

新的优先级顺序：
1. **Meta description**（保持不变）
2. **Google SERP 搜索结果**（新增，最高优先级）
3. **H1 标题**（跳过 Google SERP）
4. **核心内容区域**
5. **第一个有意义的段落**
6. **页面标题**
7. **Body 文本**

## 代码修改

### 修改位置

1. **`extractPageContent()`** (第 24-33 行)
   - 添加 Google SERP 检测
   - 跳过 H1 提取

2. **`extractContentSnippet()`** (第 52-148 行)
   - 添加 Google SERP 检测和搜索结果提取逻辑
   - 在 H1 提取之前执行

## 预期效果

### 修改前
- **H1**: "Accessibility Links"（无用）
- **Content Snippet**: 页面通用文本或空
- **结果**: 无法准确判断搜索结果的相关性

### 修改后
- **H1**: 跳过（Google SERP）
- **Content Snippet**: "搜索结果1标题. 摘要1 | 搜索结果2标题. 摘要2 | ..."
- **结果**: 包含前 3-5 个搜索结果的高质量摘要，能准确判断相关性

## 测试建议

### 测试用例

1. **Google 搜索结果页**
   - URL: `https://www.google.com/search?q=vercel+deployment`
   - 预期：提取前 3-5 个搜索结果的标题和摘要
   - 预期：跳过 H1 标签

2. **普通 Google 页面**（非搜索结果）
   - URL: `https://www.google.com/about`
   - 预期：正常提取 H1 和内容

3. **其他搜索引擎**
   - 预期：不受影响，使用正常提取逻辑

## 日志输出

Google SERP 检测时会输出：
- `🔍 Google SERP detected, extracting search results...`
- `Found X results using selector: .g`
- `Extracted X search results, total length: XXX`

如果没有找到搜索结果：
- `⚠️ No search results found, falling back to normal extraction`

## 相关文件

- `extension/content.js` - 主要修改文件

