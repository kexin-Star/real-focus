# AI 结果缓存实现说明

## 概述

在 Service Worker (`background.js`) 中实现了完整的 URL 相关 AI 结果本地缓存逻辑，以减少重复 API 调用和成本。

## 实现功能

### 1. 缓存结构

使用 `chrome.storage.local` 存储缓存数据：
- **键名**: `aiCache`
- **键值**: 对象，其中：
  - **键**: 页面的完整 URL
  - **值**: 包含以下信息的对象：
    - `score`: AI 返回的相关性得分 (number)
    - `status`: AI 返回的状态 (string, "Stay" 或 "Block")
    - `reason`: AI 返回的理由 (string)
    - `timestamp`: 缓存创建时的 Unix 时间戳 (number)

### 2. 核心函数

#### `getCache(url)`
- 检查缓存中是否存在该 URL 的记录
- **时效性判断**: 只有当缓存存在且时间在 **24 小时 (86400000 毫秒)** 以内，才返回缓存结果
- 如果缓存过期，自动删除并返回 `null`

#### `setCache(url, result)`
- 将 AI 的最新结果和当前时间戳存入 `aiCache`
- 在写入前检查容量，必要时清理旧缓存

#### `ensureCacheCapacity(cache, newEntry)`
- **容量管理**: 检查缓存总大小
- **LIFO 策略**: 如果超出容量（4MB），移除**最旧的**条目（按 timestamp 排序）
- 为新条目腾出空间

#### `clearOldCache()`
- 清理所有超过 24 小时的过期缓存条目
- 每小时自动执行一次

### 3. 集成流程

**修改前**:
```
popup.js → 直接调用 API → 显示结果
```

**修改后**:
```
popup.js → 发送消息到 Service Worker
         ↓
Service Worker → 检查缓存 (getCache)
         ↓
    缓存命中? 
    ├─ 是 → 返回缓存结果
    └─ 否 → 调用 API → 存储缓存 (setCache) → 返回结果
```

### 4. 消息传递

Service Worker 监听以下消息：

#### `checkRelevance`
- **请求**: `{ action: 'checkRelevance', keywords, title, url }`
- **响应**: `{ success: true, data: { relevance_score_percent, status, reason, fromCache } }`
- **功能**: 检查缓存，如果未命中则调用 API

#### `clearCache`
- **请求**: `{ action: 'clearCache' }`
- **响应**: `{ success: true }`
- **功能**: 清空所有缓存

#### `getCacheStats`
- **请求**: `{ action: 'getCacheStats' }`
- **响应**: `{ success: true, stats: { totalEntries, validEntries, expiredEntries } }`
- **功能**: 获取缓存统计信息

## 配置参数

```javascript
const CACHE_KEY = 'aiCache';                    // 缓存键名
const CACHE_TTL = 24 * 60 * 60 * 1000;         // 24 小时有效期
const MAX_CACHE_SIZE = 4 * 1024 * 1024;        // 4MB 最大缓存大小
```

## 优势

1. **减少 API 调用**: 相同 URL 在 24 小时内只调用一次 API
2. **降低成本**: 显著减少 OpenAI API 调用次数
3. **提升性能**: 缓存命中时响应速度更快
4. **自动管理**: 自动清理过期和超容量的缓存
5. **透明使用**: popup.js 无需关心缓存细节

## 使用示例

### 在 popup.js 中调用

```javascript
chrome.runtime.sendMessage({
  action: 'checkRelevance',
  keywords: 'design, figma',
  title: 'Figma Design',
  url: 'https://www.figma.com'
}, (response) => {
  if (response.success) {
    console.log('From cache:', response.data.fromCache);
    console.log('Score:', response.data.relevance_score_percent);
  }
});
```

### 检查缓存统计

```javascript
chrome.runtime.sendMessage(
  { action: 'getCacheStats' },
  (response) => {
    if (response.success) {
      console.log('Total entries:', response.stats.totalEntries);
      console.log('Valid entries:', response.stats.validEntries);
    }
  }
);
```

## 注意事项

1. **缓存键**: 使用完整 URL 作为键，包括查询参数
2. **时效性**: 缓存有效期 24 小时，过期自动删除
3. **容量限制**: 最大 4MB，超出时自动清理最旧条目
4. **错误处理**: API 调用失败时不会缓存错误结果
5. **并发安全**: Service Worker 处理所有缓存操作，确保一致性

## 测试建议

1. 访问同一网站多次，验证缓存命中
2. 等待 24 小时后，验证缓存过期
3. 大量访问不同网站，验证容量管理
4. 检查控制台日志，查看缓存命中/未命中情况


