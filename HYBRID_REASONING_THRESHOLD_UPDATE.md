# Hybrid Reasoning 阈值调整

## 修改目标

调整 Hybrid Reasoning 阈值，将 Fast Block 边界上移，以减少误伤（特别是工具链页面），同时保持性能优势。

## 修改内容

### 1. Fast Block 阈值调整

**修改前**：
- Fast Block 阈值：`semantic_score <= 35`
- 语义分数 ≤ 35 的页面直接 Fast Block，跳过 GPT 分析

**修改后**：
- Fast Block 阈值：`semantic_score <= 20`
- 只有语义分数 ≤ 20 **且**不是工具链域名的页面才 Fast Block
- **目的**：减少误伤，确保只有极其不相关的页面（如 10% 相关的社交娱乐内容）才被跳过 GPT

### 2. Slow Think (GPT 深度分析) 区间扩大

**修改前**：
- GPT 分析区间：`35 < semantic_score < 75`
- 只有语义分数在 35-75 之间的页面才触发 GPT 分析

**修改后**：
- GPT 分析区间：`20 < semantic_score < 75` **或** 工具链域名（即使 `semantic_score <= 20`）
- **目的**：将 Vercel Docs (15%)、Gemini App (15%) 等被误伤的工具链页面，强制拉入 GPT 流程进行常识修正

### 3. 工具链域名识别（新增）

**新增功能**：
- 定义了 `TOOL_CHAIN_DOMAINS` 列表，包含常见的开发工具和 AI 工具域名
- 如果页面是工具链域名，即使语义分数 ≤ 20，也会强制进入 GPT 分析
- **目的**：避免工具链页面被误判为不相关

**工具链域名列表**：
- Vercel: `vercel.com`, `docs.vercel.com`
- GitHub: `github.com`, `docs.github.com`
- AI 工具: `gemini.google.com`, `chat.openai.com`, `claude.ai`, `cursor.sh`
- 文档站点: `developer.mozilla.org`, `nodejs.org`, `react.dev`
- 其他: `stackoverflow.com`, `npmjs.com`, `gitlab.com` 等

## 修改后的逻辑流程

```
语义分数判断流程：

1. semantic_score >= 75
   → Fast Pass (跳过 GPT，直接返回 90%, Stay)

2. semantic_score <= 20 且 不是工具链域名
   → Fast Block (跳过 GPT，直接返回 15%, Block)

3. 其他情况（20 < semantic_score < 75 或 工具链域名）
   → Slow Think (GPT 深度分析)
   → GPT 根据内容判断最终分数和状态
```

## 预期效果

### 修改前的问题

- **Vercel Docs (15%)**: 语义分数 15% ≤ 35 → Fast Block → 返回 15%, Block ❌
- **Gemini App (15%)**: 语义分数 15% ≤ 35 → Fast Block → 返回 15%, Block ❌
- **OpenAI Usage (15%)**: 语义分数 15% ≤ 35 → Fast Block → 返回 15%, Block ❌

### 修改后的效果

- **Vercel Docs (15%)**: 
  - 语义分数 15% ≤ 20 ✅
  - 但是 `vercel.com` 是工具链域名 ✅
  - → 强制进入 GPT 分析 ✅
  - → GPT 识别为开发工具文档 → 返回 70-85%, Stay ✅

- **Gemini App (15%)**: 
  - 语义分数 15% ≤ 20 ✅
  - 但是 `gemini.google.com` 是工具链域名 ✅
  - → 强制进入 GPT 分析 ✅
  - → GPT 识别为 AI 助手工具 → 返回 70-85%, Stay ✅

- **OpenAI Usage (15%)**: 
  - 语义分数 15% ≤ 20 ✅
  - 但是 `openai.com` 是工具链域名 ✅
  - → 强制进入 GPT 分析 ✅
  - → GPT 识别为开发工具 → 返回 70-85%, Stay ✅

## 性能影响

### 性能优化

- **Fast Block 阈值降低**：从 ≤35 降到 ≤20
  - 更多页面会进入 GPT 分析（20-35 区间的页面）
  - 但工具链页面会被正确识别，减少误伤

### 性能权衡

- **GPT 调用增加**：20-35 区间的页面现在会调用 GPT
- **但这是必要的**：因为这部分页面容易被误判，需要 GPT 的常识推理来修正

## 代码变更

### 主要修改位置

`api/focus-assistant.js`:
- 第 488-521 行：添加工具链域名识别逻辑
- 第 541 行：Fast Block 条件从 `semantic_score <= 35` 改为 `semantic_score <= 20 && !isToolChainDomain`
- 第 557-564 行：GPT 分析条件更新，包含工具链域名例外

## 测试建议

### 测试用例

1. **Vercel Docs** (`https://vercel.com/docs/errors/error-list#recursive-invocation-of-commands`)
   - 预期：进入 GPT 分析，返回 70-85%, Stay

2. **Gemini App** (`https://gemini.google.com/app/fbb32d5518bd52b6`)
   - 预期：进入 GPT 分析，返回 70-85%, Stay

3. **普通社交娱乐页面** (`https://xiaohongshu.com/...`)
   - 预期：如果语义分数 ≤ 20，Fast Block，返回 15%, Block

4. **高相关性页面** (`https://github.com/...` 且语义分数 ≥ 75)
   - 预期：Fast Pass，返回 90%, Stay（不调用 GPT）

## 相关文件

- `api/focus-assistant.js` - 主要修改文件

