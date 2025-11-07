# Chrome 扩展测试指南

## 快速开始

### 1. 加载扩展

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的 **"开发者模式"**
4. 点击 **"加载已解压的扩展程序"**
5. 选择 `extension` 文件夹（包含 manifest.json 的文件夹）

### 2. 验证扩展已加载

- ✅ 扩展图标应出现在 Chrome 工具栏
- ✅ 在扩展管理页面应显示 "Real Focus Assistant"
- ✅ 没有错误提示

## 功能测试清单

### Frame 1: 输入状态测试

- [ ] 点击扩展图标，弹出窗口显示
- [ ] 输入框可以输入文本
- [ ] 输入示例：`Figma, UI设计, 原型设计`
- [ ] 点击 "Start Focus" 按钮
- [ ] 验证状态切换到 Frame 2

### Frame 2: 专注状态测试

- [ ] 显示输入的关键词（Subject）
- [ ] 计时器开始运行（显示 00:00:01, 00:00:02...）
- [ ] 显示当前网站 URL
- [ ] 显示相关性得分（Relevant %）
- [ ] 显示状态（Stay/Block）
- [ ] 点击暂停按钮，切换到 Frame 3

### Frame 3: 暂停状态测试

- [ ] 计时器暂停
- [ ] 显示已累计的时间
- [ ] 点击播放按钮，恢复计时
- [ ] 验证切换回 Frame 2

### API 集成测试

1. **打开一个相关网站**（如 https://www.figma.com）
   - [ ] 扩展应自动检测网站
   - [ ] 显示相关性分析
   - [ ] 检查浏览器控制台（F12）是否有 API 调用日志

2. **打开一个无关网站**（如 https://www.xiaohongshu.com）
   - [ ] 显示低相关性得分
   - [ ] 状态应为 "Block"

### 缓存功能测试

1. **首次访问网站**
   - [ ] 检查控制台日志：`Cache miss, calling API`
   - [ ] 记录响应时间

2. **再次访问相同网站**（24小时内）
   - [ ] 检查控制台日志：`Cache hit`
   - [ ] 响应应该更快
   - [ ] 结果应该相同

### 内容提取测试

1. **打开一个有完整内容的网页**
   - [ ] 检查控制台日志：`Content extracted`
   - [ ] 验证提取了 title, h1, description, content_snippet

2. **检查 Network 标签**
   - [ ] API 请求应包含 `content_snippet` 参数
   - [ ] 验证 content_snippet 长度 ≤ 500 字符

## 调试工具

### 查看日志

1. **Popup 日志**:
   - 右键点击扩展图标 → "检查弹出内容"
   - 或：打开 popup，按 F12

2. **Background Service Worker 日志**:
   - 在 `chrome://extensions/` 页面
   - 找到 "Real Focus Assistant"
   - 点击 "service worker" 链接
   - 查看 Console 标签

3. **Content Script 日志**:
   - 在网页上按 F12
   - 查看 Console 标签
   - 应该看到 "Real Focus Assistant content script loaded"

### 检查存储

1. **查看缓存数据**:
   - 在 Background Service Worker 控制台运行：
   ```javascript
   chrome.storage.local.get(['aiCache'], (result) => {
     console.log('Cache:', result.aiCache);
   });
   ```

2. **查看任务关键词**:
   ```javascript
   chrome.storage.local.get(['focusKeywords'], (result) => {
     console.log('Keywords:', result.focusKeywords);
   });
   ```

## 常见问题排查

### 扩展无法加载

- ✅ 检查 manifest.json 语法是否正确
- ✅ 确保所有必需文件存在
- ✅ 查看扩展管理页面的错误信息

### API 调用失败

- ✅ 检查网络连接
- ✅ 验证 API URL 是否正确
- ✅ 检查 Vercel 部署状态
- ✅ 查看 Network 标签中的错误信息

### 内容提取失败

- ✅ 检查 content script 是否注入（查看网页控制台）
- ✅ 某些页面（如 chrome://）无法注入 content script（正常）
- ✅ 检查 manifest.json 中的 content_scripts 配置

### 缓存不工作

- ✅ 检查 Background Service Worker 是否运行
- ✅ 查看 Service Worker 控制台的日志
- ✅ 验证 chrome.storage.local 权限

## 测试场景

### 场景 1: 高相关性网站
- **网站**: https://www.figma.com
- **关键词**: "Figma, UI设计"
- **预期**: 分数 ≥ 90%, Status: Stay

### 场景 2: 低相关性网站
- **网站**: https://www.xiaohongshu.com
- **关键词**: "Figma, UI设计"
- **预期**: 分数 < 50%, Status: Block

### 场景 3: 模糊相关性网站
- **网站**: 设计工具对比文章
- **关键词**: "Figma, UI设计"
- **预期**: 分数 50-89%, 可能调用 GPT 深度分析

## 性能检查

- ✅ 首次 API 调用响应时间：~2-3 秒
- ✅ 缓存命中响应时间：< 100ms
- ✅ 内容提取时间：< 50ms
- ✅ Popup 打开时间：< 200ms

## 完成测试后

如果所有测试通过，扩展已准备好使用！

如有问题，请检查：
1. 浏览器控制台错误
2. Service Worker 日志
3. Network 请求状态
4. Vercel 部署日志


