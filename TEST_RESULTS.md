# 测试结果说明

## 测试场景

**任务关键词：** 我正在利用cursor vibe coding做一个帮助stay focus的小插件

**当前网页：**
- **Title:** 小胖da - 小红书
- **URL:** https://www.xiaohongshu.com/explore/69018b620000000004022c4b

## 预期结果

根据 Prompt V1.0 的逻辑，这个场景应该返回：

- **relevance_score_percent:** 应该很低（< 50%），因为：
  - 任务关键词是关于 "cursor vibe coding" 和 "stay focus 小插件"（开发任务）
  - 当前网页是小红书（社交媒体平台）
  - 两者完全不相关

- **status:** "Block"（因为得分 < 50）

- **reason:** 中文回复，说明为什么这是无关内容

## 如何测试

### 方法 1: 使用测试脚本

```bash
node test-focus.js
```

### 方法 2: 使用 curl

```bash
curl -X POST https://your-vercel-url/api/focus-assistant \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": "我正在利用cursor vibe coding做一个帮助stay focus的小插件",
    "title": "小胖da - 小红书",
    "url": "https://www.xiaohongshu.com/explore/69018b620000000004022c4b"
  }'
```

### 方法 3: 检查 Vercel Dashboard

1. 访问 https://vercel.com/dashboard
2. 找到 `real-focus` 或 `ai-focus` 项目
3. 查看最新的部署状态
4. 点击部署查看日志，确认新代码已部署

## 获取最新部署 URL

在 Vercel Dashboard 中：
- 进入项目
- 查看 **Deployments** 标签
- 复制最新的部署 URL

## 注意事项

1. **部署时间：** GitHub push 后，Vercel 通常需要 1-2 分钟完成部署
2. **环境变量：** 确保 `OPENAI_API_KEY` 已在 Vercel 中配置
3. **代码版本：** 确认最新的代码已部署（检查部署日志）

## 预期响应格式

```json
{
  "relevance_score_percent": 15,
  "status": "Block",
  "reason": "当前网页是小红书社交媒体平台，与cursor编程和stay focus插件开发任务完全无关，属于娱乐和社交媒体内容，会分散注意力"
}
```

