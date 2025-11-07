# requires_time_control 功能说明

## 功能概述

新增 `requires_time_control` 字段，用于识别在干扰域名（社交媒体、娱乐平台）上发生的 Meta-Task 搜索意图。当检测到用户在干扰平台上搜索工作相关内容时，返回 `requires_time_control: true`，建议设置时间控制而不是直接阻止。

## 实现逻辑

### 判断条件

当满足以下**两个条件**时，返回 `requires_time_control: true`：

1. **URL/Title 包含 Meta-Task 关键词**
   - 中文关键词：用量、账单、配置、密钥、文档、控制台
   - 英文关键词：usage, billing, api key, console, dashboard, github, gitlab, vercel, login, auth, settings, account, profile, documentation, docs

2. **域名在干扰域名黑名单中**
   - 包括：小红书、微博、抖音、Instagram、Facebook、Twitter、YouTube 等

### 返回结果

当检测到 Meta-Task 搜索在干扰域名上时：

- **跳过所有 Hybrid Reasoning 逻辑**（Fast Block / Fast Pass / GPT 分析）
- **直接返回**：
  ```json
  {
    "relevance_score_percent": 50,
    "status": "Stay",
    "reason": "检测到在干扰平台上搜索工作相关内容，建议设置时间控制",
    "requires_time_control": true
  }
  ```

### 其他情况

- 所有其他情况（正常 Hybrid Reasoning）返回 `requires_time_control: false`

## 测试结果

### ✅ 测试用例 1：小红书上搜索 "vercel"
- **输入**：`https://xiaohongshu.com/search?q=vercel`
- **结果**：`requires_time_control: true`, `status: Stay`, `score: 50%`
- **响应时间**：286ms（跳过了 GPT 分析）

### ✅ 测试用例 2：微博上的 "用量" 页面
- **输入**：`https://weibo.com/account/usage`
- **结果**：`requires_time_control: true`, `status: Stay`, `score: 50%`
- **响应时间**：347ms（跳过了 GPT 分析）

### ✅ 测试用例 3：Vercel 上的 usage 页面（合法工具）
- **输入**：`https://vercel.com/usage`
- **结果**：`requires_time_control: false`, `status: Stay`, `score: 70%`
- **说明**：域名不在黑名单，走正常 Hybrid Reasoning

### ✅ 测试用例 4：小红书上普通内容
- **输入**：`https://xiaohongshu.com/discover/food`
- **结果**：`requires_time_control: false`, `status: Block`, `score: 15%`
- **说明**：不包含 Meta-Task 关键词，走正常 Fast Block

### ✅ 测试用例 5：抖音上搜索 "github"
- **输入**：`https://douyin.com/search?q=github`
- **结果**：`requires_time_control: true`, `status: Stay`, `score: 50%`
- **响应时间**：174ms（跳过了 GPT 分析）

## 使用场景

### 场景 1：用户在社交媒体上搜索工作工具

**示例**：用户在小红书上搜索 "vercel"

**行为**：
- 检测到 Meta-Task 关键词 "vercel"
- 检测到域名 "xiaohongshu.com" 在黑名单中
- 返回 `requires_time_control: true`

**建议**：
- 允许访问，但设置时间限制（如 5 分钟）
- 提醒用户这是干扰平台，建议使用官方文档

### 场景 2：用户在合法工具网站上查看 Meta-Task 页面

**示例**：用户在 Vercel 上查看 usage 页面

**行为**：
- 检测到 Meta-Task 关键词 "usage"
- 检测到域名 "vercel.com" **不在**黑名单中
- 走正常 Hybrid Reasoning，返回 `requires_time_control: false`

**建议**：
- 正常允许访问，无需时间控制

## API 响应格式

### 成功响应（时间控制场景）

```json
{
  "relevance_score_percent": 50,
  "status": "Stay",
  "reason": "检测到在干扰平台上搜索工作相关内容，建议设置时间控制",
  "requires_time_control": true
}
```

### 成功响应（正常场景）

```json
{
  "relevance_score_percent": 70,
  "status": "Stay",
  "reason": "该页面提供API使用和计费信息，可能对vibecoding项目有帮助。",
  "requires_time_control": false
}
```

## 性能优化

- **跳过 GPT 分析**：当检测到时间控制场景时，直接返回，不调用 GPT API
- **快速响应**：响应时间通常在 200-400ms 之间（相比 GPT 分析的 2000-3000ms）

## 代码位置

- **干扰域名黑名单**：`api/focus-assistant.js` 第 18-129 行
- **时间控制逻辑**：`api/focus-assistant.js` 第 433-461 行
- **返回字段**：所有返回 JSON 都包含 `requires_time_control` 字段

## 测试方法

运行自动化测试：

```bash
# 确保本地服务器运行
npm run local

# 在另一个终端运行测试
LOCAL_TEST=true node test-time-control.js
```

或使用交互式测试：

```bash
npm run test:local
```

然后输入包含 Meta-Task 关键词的干扰域名 URL。

