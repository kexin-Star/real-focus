# Meta-Task 逻辑修复说明

## 修复目标

修复 Meta-Task 逻辑，使其能正确拦截社交/娱乐域名上的"元任务"搜索，同时允许合法工具网站（如 Vercel、GitHub）的 Meta-Task 页面通过。

## 修改内容

### 1. 添加干扰域名黑名单

在文件顶部定义了 `INTERFERENCE_DOMAINS` 常量数组，包含：

- **中文社交媒体和娱乐平台**：小红书、微博、抖音、头条、知乎、B站等
- **国际社交媒体和娱乐平台**：Instagram、Facebook、Twitter、YouTube、Reddit等
- **新闻媒体**：CNN、BBC、纽约时报、TechCrunch等
- **游戏平台**：Steam、Epic Games、PlayStation等
- **其他干扰网站**：Wikipedia、Quora、Stack Overflow等

**注意**：`github.com`、`gitlab.com`、`vercel.com` 等合法工作工具**不在**黑名单中，因为它们可能包含真正的 Meta-Task 页面。

### 2. 增强 `isMetaTaskPage` 函数

修改后的函数逻辑：

1. **检查 Meta-Task 关键词**：检查 URL 和 Title 是否包含 Meta-Task 关键词
2. **提取域名**：从 URL 中提取顶级域名（自动处理 www 前缀）
3. **域名黑名单检查**：只有当域名**不在**黑名单中**时，才返回 `true`
4. **保守策略**：如果无法提取域名，返回 `false`（不触发 Meta-Task）

### 3. 添加域名提取函数

新增 `extractDomain(url)` 函数：
- 使用 `URL` API 解析域名
- 自动移除 `www.` 前缀
- 支持手动正则提取（作为后备方案）
- 返回小写的域名

### 4. 增强日志输出

添加详细的日志，帮助调试：
- 显示提取的域名
- 显示 Meta-Task 检查结果
- 当检测到黑名单域名时，明确说明为什么不升级分数

## 预期行为

### ✅ 场景 1：合法工具网站的 Meta-Task 页面

**输入：**
- URL: `https://vercel.com/usage`
- Title: `Usage - Vercel`
- Keywords: `我在用Claude做一个vibecoding的项目`

**处理流程：**
1. 检测到 Meta-Task 关键词 "usage"
2. 提取域名：`vercel.com`
3. 检查黑名单：`vercel.com` 不在黑名单中 ✅
4. `isMetaTaskPage` 返回 `true`
5. 如果语义分数 < 75，强制升级到 50，触发 GPT 分析
6. **结果：Stay (Pass)**

### 🚫 场景 2：社交/娱乐网站上的 Meta-Task 搜索

**输入：**
- URL: `https://xiaohongshu.com/search?q=vercel`
- Title: `Vercel - 小红书`
- Keywords: `我在用Claude做一个vibecoding的项目`

**处理流程：**
1. 检测到 Meta-Task 关键词（可能通过搜索词）
2. 提取域名：`xiaohongshu.com`
3. 检查黑名单：`xiaohongshu.com` **在**黑名单中 ❌
4. `isMetaTaskPage` 返回 `false`
5. **不强制升级分数**
6. 如果语义分数 < 35，直接 Fast Block
7. **结果：Block**

### 🚫 场景 3：社交媒体上的"用量"页面

**输入：**
- URL: `https://weibo.com/account/usage`
- Title: `用量 - 微博`
- Keywords: `我在用Claude做一个vibecoding的项目`

**处理流程：**
1. 检测到 Meta-Task 关键词 "用量"
2. 提取域名：`weibo.com`
3. 检查黑名单：`weibo.com` **在**黑名单中 ❌
4. `isMetaTaskPage` 返回 `false`
5. **不强制升级分数**
6. 如果语义分数 < 35，直接 Fast Block
7. **结果：Block**

## 代码修改位置

1. **文件顶部**（第 10-129 行）：添加 `INTERFERENCE_DOMAINS` 常量
2. **Meta-Task 检查部分**（第 343-365 行）：添加 `extractDomain` 函数
3. **Meta-Task 检查部分**（第 367-425 行）：增强 `isMetaTaskPage` 函数
4. **主逻辑部分**（第 427-457 行）：添加详细日志和调试信息

## 测试建议

使用交互式测试工具测试以下场景：

```bash
npm run test:local
```

### 测试用例 1：合法 Meta-Task 页面
- Keywords: `我在用Claude做一个vibecoding的项目`
- URL: `https://vercel.com/usage`
- Title: `Usage - Vercel`
- **预期**：触发 GPT 分析，最终 Stay

### 测试用例 2：社交媒体上的搜索
- Keywords: `我在用Claude做一个vibecoding的项目`
- URL: `https://xiaohongshu.com/search?q=vercel`
- Title: `Vercel - 小红书`
- **预期**：不触发 Meta-Task，如果语义分数低则 Fast Block

### 测试用例 3：社交媒体上的"用量"页面
- Keywords: `我在用Claude做一个vibecoding的项目`
- URL: `https://weibo.com/account/usage`
- Title: `用量 - 微博`
- **预期**：不触发 Meta-Task，如果语义分数低则 Fast Block

## 注意事项

1. **域名匹配**：支持精确匹配和子域名匹配（如 `www.xiaohongshu.com` 会匹配 `xiaohongshu.com`）
2. **保守策略**：如果无法提取域名，默认不触发 Meta-Task（返回 false）
3. **日志输出**：所有关键决策都会输出日志，便于调试和验证
4. **可扩展性**：可以轻松添加新的干扰域名到 `INTERFERENCE_DOMAINS` 数组

