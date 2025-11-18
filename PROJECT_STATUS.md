# Real Focus Assistant - 项目状态总结

> 最后更新: 2025-11-18

## 📋 项目概述

**Real Focus Assistant** 是一个 Chrome 扩展，帮助用户在浏览网页时保持专注。它使用 AI 来判断当前页面是否与用户的专注主题相关，并自动拦截不相关的干扰内容。

### 核心功能
- 🎯 **智能相关性判断**: 使用 OpenAI Embeddings 和 GPT-4o-mini 进行语义分析和深度推理
- ⚡ **混合判断策略**: Fast Pass / Fast Block / Slow Think (GPT) 三层逻辑，平衡性能和准确性
- ⏰ **时间控制**: 在干扰平台上搜索工作内容时，提供 30 秒宽限期
- 🔧 **工具链识别**: 自动识别开发工具和文档页面，避免误伤
- 📦 **缓存机制**: 24 小时缓存，减少 API 调用成本

---

## ✅ 已实现的功能

### 1. 后端 API (`api/focus-assistant.js`)

#### 1.1 混合判断策略 (Hybrid Reasoning)
- **Fast Pass** (语义分数 ≥ 75): 直接通过，不调用 GPT
- **Fast Block** (语义分数 ≤ 20): 直接拦截，不调用 GPT
- **Slow Think** (20 < 语义分数 < 75): 调用 GPT 深度分析

#### 1.2 工具链识别
- **工具链域名检测**: 识别 Vercel, GitHub, Gemini 等开发工具域名
- **工具链关键词检测**: 检测 URL/Title/Content 中的工具链关键词
  - 工具关键词: vercel, github, gemini, google, openai, claude, cursor 等
  - 文档关键词: docs, documentation, api, reference, guide, cli, error 等
- **分数强制提升**: 如果检测到工具链关键词且语义分数 ≤ 35，强制提升到 40，确保进入 GPT 分析

#### 1.3 Meta-Task 逻辑
- **Meta-Task 页面识别**: 识别必要的流程管理页面（用量、账单、配置等）
- **干扰域名黑名单**: 排除社交媒体、娱乐平台上的 Meta-Task 搜索
- **时间控制触发**: 在干扰平台上搜索工作内容时，返回 `requires_time_control: true`

#### 1.4 Prompt V3.3 优化
- **文档价值规则**: 强制工具链文档页面分数在 70-90% 之间
- **常识推理增强**: 强调开发工具、文档、错误指南的重要性
- **多语言支持**: 自动检测用户语言并返回对应语言的结果

#### 1.5 干扰域名黑名单
包含 50+ 个干扰域名：
- 中文社交媒体: 小红书、微博、抖音、知乎、B站等
- 国际社交媒体: Instagram, Twitter, Facebook, TikTok 等
- 娱乐平台: YouTube, Netflix, Spotify 等
- 新闻平台: 今日头条、新浪、网易等
- 购物平台: 淘宝、京东、拼多多等

### 2. Chrome Extension

#### 2.1 Background Script (`extension/background.js`)
- **API 调用**: 调用 Vercel Serverless Function
- **缓存管理**: 24 小时缓存，自动清理过期缓存
- **内容提取**: 从 Content Script 提取页面内容
- **时间控制**: 管理 30 秒宽限期计时器
- **Tab 监听**: 监听标签页切换和关闭，清理计时器

#### 2.2 Content Script (`extension/content.js`)
- **内容提取**: 智能提取页面标题、H1、Meta 描述、内容摘要
- **干扰内容排除**: 自动排除边栏、页脚、备案信息等干扰内容
- **核心内容识别**: 优先从搜索结果、Feed 列表等核心区域提取
- **Google SERP 特殊处理**: 
  - 检测 Google 搜索结果页
  - 跳过 H1 标签（通常是 "Accessibility Links"）
  - 优先提取前 3-5 个搜索结果的标题和摘要
  - 支持多种 Google 搜索结果选择器（.g, .rc, .tF2Cxc 等）
- **UI 注入**: 显示时间控制倒计时和拦截界面
- **30秒横幅优化**: 添加页面 padding，不遮挡搜索框和页面内容
- **UI 文本**: 所有界面文本使用英文

#### 2.3 Popup UI (模块化架构)
- **专注主题设置**: 用户输入和编辑专注主题
  - Frame1 (输入状态): 支持输入并更新主题
  - Frame2 (专注状态): 支持编辑 subject，实时更新
  - 两个输入框双向同步
- **计时器**: 显示专注时长和 Pomodoro 倒计时
  - Focus: 25 分钟
  - Short Break: 5 分钟
  - Long Break: 15 分钟
- **状态显示**: 显示当前页面的相关性分数和状态
- **缓存清理**: 修改专注主题时自动清理缓存
- **模块化架构**: 
  - `popup.js` (787 行) - 主入口文件，协调各模块
  - `ui-manager.js` (657 行) - DOM 元素引用和 UI 更新
  - `storage-utils.js` (94 行) - Chrome Storage 操作
  - `event-handlers.js` (417 行) - 事件处理函数
  - `time-utils.js` (77 行) - 时间格式化工具函数

### 3. 本地测试环境

#### 3.1 本地服务器 (`local-server.js`)
- 直接运行 Vercel Serverless Function，无需 Vercel CLI
- 支持 CORS，可直接被 Extension 调用

#### 3.2 测试脚本
- `test-hybrid-strategy.js`: 交互式测试混合判断策略（主要测试工具）
- `test-openai-key.js`: 测试 OpenAI API Key 配置

---

## 🏗️ 后端逻辑架构

### 请求处理流程

```
1. 接收请求
   ↓
2. 提取参数 (keywords, title, url, content_snippet)
   ↓
3. 生成 Embeddings (keywords 和 webpage content)
   ↓
4. 计算语义相似度分数 (0-100)
   ↓
5. Meta-Task 检测
   ├─ 干扰域名 + Meta-Task 关键词 → 返回时间控制
   └─ 非干扰域名 + Meta-Task 关键词 → 强制分数 50
   ↓
6. 工具链域名检测
   ↓
7. 工具链关键词检测 (在 Fast Block 之前)
   ├─ 检测到关键词 + 分数 ≤ 35 → 强制分数 40
   ↓
8. 混合判断策略
   ├─ 分数 ≥ 75 → Fast Pass (90%, Stay)
   ├─ 分数 ≤ 20 且非工具链 → Fast Block (15%, Block)
   └─ 其他 → Slow Think (GPT 深度分析)
   ↓
9. GPT 分析 (如果进入 Slow Think)
   ├─ 应用 Prompt V3.3
   ├─ 文档价值规则检查
   └─ 返回修正后的分数和原因
   ↓
10. 返回结果
    {
      relevance_score_percent: 0-100,
      status: "Stay" | "Block",
      reason: "解释",
      requires_time_control: true/false
    }
```

### 关键阈值

- **Fast Pass**: ≥ 75
- **Fast Block**: ≤ 20 (且非工具链域名/关键词)
- **Slow Think**: 20 < 分数 < 75 或工具链页面
- **工具链分数提升**: ≤ 35 → 40
- **Meta-Task 分数**: 强制 50
- **文档价值规则**: 强制 70-90%

### 缓存策略

- **缓存键**: `${url}|${keywords}` (URL + keywords 复合键)
- **缓存时长**: 24 小时
- **缓存大小限制**: 4MB
- **自动清理**: 过期条目自动删除
- **缓存清理**: 修改专注主题时自动清理所有缓存

---

## 📁 项目文件结构

```
real-focus/
├── api/
│   └── focus-assistant.js          # 核心 API 逻辑 (762 行)
├── extension/
│   ├── background.js               # Service Worker (1,535 行)
│   ├── content.js                   # Content Script (923 行)
│   ├── popup.js                     # Popup 主入口 (787 行)
│   ├── ui-manager.js                # UI 管理模块 (657 行)
│   ├── storage-utils.js             # 存储工具模块 (92 行)
│   ├── event-handlers.js            # 事件处理模块 (417 行)
│   ├── time-utils.js                # 时间工具模块 (55 行)
│   ├── popup.html                   # Popup HTML (196 行)
│   ├── popup.css                    # Popup 样式 (843 行)
│   └── manifest.json                # Extension 配置
├── local-server.js                  # 本地测试服务器
├── package.json                     # 项目配置
├── vercel.json                      # Vercel 配置
└── [测试脚本和文档]

总代码行数: ~6,292 行 (核心代码)
```

---

## 📚 项目文档

### 核心文档
- **README.md** - 项目主文档
- **PROJECT_STATUS.md** - 项目状态总结（本文档）
- **PROJECT_SUMMARY.md** - 项目总结
- **QUICK_START.md** - 快速开始指南

### 功能文档
- **HYBRID_REASONING_THRESHOLD_UPDATE.md** - 混合判断阈值更新说明
- **TOOLCHAIN_KEYWORD_FIX.md** - 工具链关键词修复说明
- **TIME_CONTROL_FEATURE.md** - 时间控制功能说明
- **META_TASK_FIX.md** - Meta-Task 修复说明
- **GOOGLE_SERP_FIX.md** - Google 搜索结果页内容提取修复

### 使用指南
- **LOCAL_TEST_CHECKLIST.md** - 本地测试检查清单
- **LOCAL_TEST_SETUP.md** - 本地测试设置
- **GITHUB_SETUP.md** - GitHub 设置说明
- **PUSH_TO_GITHUB.md** - Git 推送说明

### 开发文档
- **FRONTEND_STATUS.md** - 前端开发进度和 UI 实现

### 测试脚本
- `test-hybrid-strategy.js` - 交互式测试混合判断策略（主要测试工具）
- `test-openai-key.js` - 测试 OpenAI API Key 配置

---

## 🔄 当前开发状态

### 最新修改 (2025-01-XX)

#### 已完成的功能
1. ✅ **Popup.js 模块化重构**: 
   - 将 1,536 行的 `popup.js` 拆分为 5 个模块
   - `popup.js` (787 行) - 主入口文件，负责协调
   - `ui-manager.js` (657 行) - DOM 元素引用和 UI 更新
   - `storage-utils.js` (92 行) - Chrome Storage 操作
   - `event-handlers.js` (417 行) - 事件处理函数
   - `time-utils.js` (55 行) - 时间格式化工具
   - 提高代码可维护性、可测试性和可读性
2. ✅ **工具链关键词检测**: 在 Fast Block 之前检测工具链关键词，强制提升分数
3. ✅ **内容提取优化**: 排除边栏、页脚等干扰内容，优先提取核心搜索结果
4. ✅ **Google SERP 内容提取**: 
   - 检测 Google 搜索结果页
   - 跳过 H1 标签（"Accessibility Links"）
   - 提取前 3-5 个搜索结果的标题和摘要
5. ✅ **缓存清理**: 修改专注主题时自动清理缓存（缓存键包含 URL 和 keywords）
6. ✅ **日志增强**: 添加 Content Snippet 预览到日志
7. ✅ **代码清理**: 
   - 删除 5 个不再需要的测试脚本
   - 清理 legacy 代码（content.js 中的旧消息名称支持）
   - 清理未使用的 CSS 样式（popup.css 中的 legacy 样式）
8. ✅ **UI 优化**:
   - 30 秒横幅优化：添加页面 padding，不遮挡搜索框
   - 所有 UI 文本从中文改为英文
   - Subject 输入框同步：frame1 和 frame2 双向同步
9. ✅ **Pomodoro 计时器**: 将测试值改回生产值（25分钟/5分钟/15分钟）
10. ✅ **Subject 更新逻辑优化**:
    - Frame1 输入框支持更新主题（不启动计时器）
    - Frame2 subject 编辑支持实时更新
    - 两个输入框保持同步

#### 最近提交记录
- 模块化重构 - 拆分 popup.js 为多个模块
- `3666d08` - 修复 Google 搜索结果页 (SERP) 内容提取
- `8a4e012` - 添加工具链关键词检测并清理过时文档
- `4214d3d` - 优化 Hybrid Reasoning 阈值和 Prompt V3.3

### 测试状态
- ✅ 工具链关键词检测：已实现并测试
- ✅ Google SERP 内容提取：已实现
- ✅ 内容提取优化：已实现（排除干扰内容）
- ⏳ 生产环境验证：等待部署后验证

### 已知问题
- 无

---

## 📊 技术栈

- **后端**: Vercel Serverless Functions (Node.js)
- **AI**: OpenAI API (Embeddings + GPT-4o-mini)
- **前端**: Chrome Extension (Manifest V3)
- **存储**: Chrome Storage API
- **部署**: Vercel (自动部署)

---

## 🚀 部署信息

- **API URL**: `https://real-focus-32cpqcsg8-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant`
- **GitHub**: `kexin-Star/real-focus`
- **自动部署**: Vercel 自动检测 GitHub push 并部署

---

## 📝 下一步计划

1. **生产环境验证**: 验证部署后的功能是否正常工作
2. **性能优化**: 根据使用情况优化 API 调用频率
3. **用户体验优化**: 根据用户反馈优化 UI 和交互
4. **功能扩展**: 
   - 考虑添加更多搜索引擎支持（Bing, DuckDuckGo 等）
   - 添加统计功能（每日专注时间、拦截次数等）
   - 添加白名单功能（允许特定网站）

---

## 📚 相关文档

- [前端开发进度](./FRONTEND_STATUS.md) - 前端 UI 实现和开发进度
- [本地测试检查清单](./LOCAL_TEST_CHECKLIST.md)
- [工具链关键词修复](./TOOLCHAIN_KEYWORD_FIX.md)
- [混合判断阈值更新](./HYBRID_REASONING_THRESHOLD_UPDATE.md)
- [时间控制功能](./TIME_CONTROL_FEATURE.md)
- [Google SERP 修复](./GOOGLE_SERP_FIX.md)

---

*本文档会随着项目进展持续更新*

