# 工具链关键词检测修复

## 修改目标

确保工具链/Meta-Task 关键词的检测和分数强制提升，在任何 Fast Block 判定发生之前执行。

## 修改内容

### 1. 扩展工具链关键词列表

新增 `toolchainKeywords` 对象，包含：

**工具关键词 (tools):**
- vercel, github, gitlab, gemini, google, openai, claude, cursor
- npm, node, react, vue, angular, nextjs, nuxt

**文档关键词 (documentation):**
- docs, documentation, api, reference, guide, tutorial
- getting-started, quickstart, examples
- cli, command, error, errors, troubleshooting
- faq, help, support

### 2. 在 Fast Block 之前添加工具链关键词检测

**逻辑位置：**
- 在 `Tool Chain Domain Detection` 之后
- 在 `Tier 1: High Relevance (Fast Pass)` 之前
- **关键：在 `Tier 2: Low Relevance (Fast Block)` 之前**

**检测逻辑：**
```javascript
// 检查 URL/Title/Content 是否包含工具链关键词
const combinedTextForToolchain = `${url} ${title} ${content_snippet || ''}`.toLowerCase();
const hasToolchainKeyword = toolchainKeywords.tools.some(...) || 
                            toolchainKeywords.documentation.some(...);

// 如果检测到工具链关键词且语义分数 <= 35，强制提升分数
if (hasToolchainKeyword && semantic_score <= 35 && !isInterferenceDomain) {
  semantic_score = 40; // 跳过 Fast Block (<= 20)，进入 GPT 分析
}
```

### 3. 执行顺序

现在的执行顺序：

1. **Meta-Task 检测**（干扰域名上的 Meta-Task 搜索 → 时间控制）
2. **Meta-Task 逻辑**（非干扰域名的 Meta-Task 页面 → 强制分数 50）
3. **工具链域名检测**（识别工具链域名）
4. **工具链关键词检测**（新增，在 Fast Block 之前）✅
   - 如果检测到工具链关键词且语义分数 <= 35
   - 强制提升分数到 40
   - 确保进入 GPT 分析，跳过 Fast Block
5. **Fast Pass**（语义分数 >= 75）
6. **Fast Block**（语义分数 <= 20 且不是工具链域名）
7. **Slow Think (GPT)**（20 < 语义分数 < 75 或工具链域名/关键词）

## 解决的问题

### 问题案例：Vercel /docs 页面

**修改前：**
- URL: `https://vercel.com/docs/errors/error-list`
- 语义分数: 15%
- 结果: Fast Block (15% <= 20) → 返回 15%, Block ❌

**修改后：**
- URL: `https://vercel.com/docs/errors/error-list`
- 语义分数: 15%
- 工具链关键词检测: ✅ 检测到 "vercel", "docs", "error"
- 分数强制提升: 15% → 40%
- 结果: Slow Think (GPT) → 返回 70-85%, Stay ✅

## 关键特性

1. **优先级最高**：工具链关键词检测在 Fast Block 之前执行
2. **覆盖范围广**：不仅检查域名，还检查 URL/Title/Content 中的关键词
3. **双重保护**：
   - 工具链域名检测（已有）
   - 工具链关键词检测（新增）
4. **避免误伤**：排除干扰域名（小红书等）

## 测试建议

测试用例：
1. `https://vercel.com/docs/errors/error-list` - 应检测到关键词，强制进入 GPT
2. `https://gemini.google.com/app/...` - 应检测到关键词，强制进入 GPT
3. `https://github.com/docs/...` - 应检测到关键词，强制进入 GPT
4. `https://www.xiaohongshu.com/...` - 干扰域名，不触发工具链检测

