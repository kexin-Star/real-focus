# Real Focus Assistant - 测试指南

> 最后更新: 2025-11-07

## 🚀 快速开始

### 1. 启用 Mocking（零成本 UI 测试）

在 `extension/background.js` 中启用 Mocking：

```javascript
const IS_MOCKING_ENABLED = true; // 改为 true
```

**注意**: 测试完成后，记得改回 `false` 用于生产环境。

---

## 📦 加载 Extension 到 Chrome

### 步骤 1: 打开 Chrome 扩展管理页面

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的 **"开发者模式"** (Developer mode)

### 步骤 2: 加载 Extension

1. 点击 **"加载已解压的扩展程序"** (Load unpacked)
2. 选择项目的 `extension/` 文件夹
3. Extension 加载成功后，会显示在扩展列表中

### 步骤 3: 重新加载 Extension（修改代码后）

1. 在 `chrome://extensions/` 页面
2. 找到 "Real Focus Assistant" 扩展
3. 点击 **刷新按钮** (🔄) 重新加载最新代码

---

## 🧪 测试场景

### 场景 1: Time Control UI（30秒倒计时横幅）

**目标**: 测试在干扰平台上搜索工作内容时的 30 秒宽限期

**步骤**:
1. 启用 Mocking (`IS_MOCKING_ENABLED = true`)
2. 重新加载 Extension
3. 打开 Popup，输入专注主题（例如："开发 Chrome Extension"）
4. 点击 "Start Focus"
5. 访问以下 URL 之一：
   - `https://www.google.com/search?q=vercel`
   - `https://www.xiaohongshu.com`

**预期结果**:
- ✅ 页面顶部显示 M3 风格的倒计时横幅
- ✅ 显示 "当前正在干扰平台进行搜索，你有 30 秒时间查看，之后将强制拦截"
- ✅ 倒计时从 30 秒开始递减
- ✅ 最后 5 秒倒计时变红色
- ✅ 30 秒后如果仍在页面，显示全屏红色拦截界面

---

### 场景 2: Block UI（全屏拦截界面）

**目标**: 测试不相关页面的立即拦截

**步骤**:
1. 启用 Mocking
2. 重新加载 Extension
3. 打开 Popup，输入专注主题
4. 点击 "Start Focus"
5. 访问以下 URL 之一：
   - `https://www.weibo.com`
   - `https://www.bilibili.com`
   - `https://www.douyin.com`

**预期结果**:
- ✅ 立即显示全屏红色拦截界面
- ✅ 显示拦截图标（🚫）
- ✅ 显示相关性分数（15%）
- ✅ 显示 AI 的拦截理由
- ✅ 显示 "返回上一页" 按钮

---

### 场景 3: Stay UI（正常通过）

**目标**: 测试相关页面的正常访问

**步骤**:
1. 启用 Mocking
2. 重新加载 Extension
3. 打开 Popup，输入专注主题
4. 点击 "Start Focus"
5. 访问以下 URL 之一：
   - `https://vercel.com/docs`
   - `https://github.com`
   - `https://gemini.google.com`

**预期结果**:
- ✅ 页面正常显示，无拦截 UI
- ✅ Popup 显示高相关性分数（85%）
- ✅ Popup 显示 "Stay" 状态（绿色）
- ✅ 无时间控制横幅

---

### 场景 4: Popup 数据同步和加载状态

**目标**: 测试 Popup 打开时的数据同步和加载体验

**步骤**:
1. 启用 Mocking
2. 重新加载 Extension
3. 打开 Popup，输入专注主题，点击 "Start Focus"
4. 访问任意测试 URL
5. **关闭 Popup**
6. **重新打开 Popup**

**预期结果**:
- ✅ 显示 M3 风格的加载指示器（旋转 Spinner + "Loading..." 文本）
- ✅ 加载完成后，显示完整数据：
  - 主题（keywords）
  - 当前网站 URL
  - 相关性分数（带颜色编码）
  - 状态（Stay/Block）
  - 专注时间
- ✅ 加载指示器自动隐藏
- ✅ 数据与 Service Worker 同步

---

### 场景 5: 后台持续工作

**目标**: 测试 Service Worker 在后台自动检查页面相关性

**步骤**:
1. 启用 Mocking
2. 重新加载 Extension
3. 打开 Popup，输入专注主题，点击 "Start Focus"
4. **关闭 Popup**
5. 访问不同的测试 URL（切换标签页或导航）

**预期结果**:
- ✅ Service Worker 自动检测 URL 变化
- ✅ 自动调用 API/Mock 检查相关性
- ✅ 自动触发相应的 UI（Time Control 横幅或 Block 界面）
- ✅ 无需打开 Popup 即可工作

---

### 场景 6: 计时器功能

**目标**: 测试专注时间计时器

**步骤**:
1. 打开 Popup，输入专注主题
2. 点击 "Start Focus"
3. 观察计时器显示
4. 点击暂停按钮
5. 点击恢复按钮

**预期结果**:
- ✅ 计时器从 00:00:00 开始
- ✅ 每秒更新显示（HH:MM:SS 格式）
- ✅ 暂停时计时器停止
- ✅ 恢复时计时器继续
- ✅ 关闭 Popup 后重新打开，计时器状态保持

---

## 🔍 验证检查清单

### Popup UI 验证

- [ ] 输入状态：输入框、提示文本、开始按钮正常显示
- [ ] 专注状态：主题、计时器、当前网站、相关性分数、状态正常显示
- [ ] 暂停状态：与专注状态相同，但显示恢复按钮
- [ ] 加载指示器：显示和隐藏正常
- [ ] 状态颜色：分数颜色编码正确（高/中/低）
- [ ] 数据同步：两个状态的数据保持一致

### Content Script UI 验证

- [ ] Time Control 横幅：显示、倒计时、样式正确
- [ ] Block 界面：全屏覆盖、红色主题、按钮功能正常
- [ ] UI 移除：切换页面时 UI 正确移除

### Service Worker 验证

- [ ] 后台工作：关闭 Popup 后仍能检测页面变化
- [ ] API 调用：正确调用 API 或 Mock
- [ ] 缓存机制：缓存命中时使用缓存数据
- [ ] 计时器管理：Time Control 计时器正确启动和清理

### 功能验证

- [ ] Mock 开关：启用/禁用 Mock 正常工作
- [ ] 状态同步：Popup 和 Service Worker 数据一致
- [ ] 错误处理：网络错误、API 错误正确处理

---

## 🐛 调试技巧

### 1. 查看 Service Worker 日志

1. 在 `chrome://extensions/` 页面
2. 找到 "Real Focus Assistant"
3. 点击 **"service worker"** 链接
4. 打开 DevTools，查看 Console 日志

### 2. 查看 Content Script 日志

1. 在任意网页上按 `F12` 打开 DevTools
2. 切换到 Console 标签
3. 查看 Content Script 的日志（前缀：`Real Focus Assistant`）

### 3. 查看 Popup 日志

1. 右键点击 Extension 图标
2. 选择 **"检查弹出式窗口"** (Inspect popup)
3. 打开 DevTools，查看 Console 日志

### 4. 常见问题排查

**问题**: Mock 不工作
- 检查 `IS_MOCKING_ENABLED` 是否为 `true`
- 检查是否重新加载了 Extension
- 查看 Service Worker 日志中的 `[MOCK]` 标记

**问题**: Popup 数据不更新
- 检查 Service Worker 是否正常运行
- 查看 Popup DevTools 中的错误信息
- 确认 `getPopupState` 消息是否成功发送

**问题**: UI 不显示
- 检查 Content Script 是否加载（查看页面 Console）
- 检查消息是否正确发送到 Content Script
- 查看 Content Script 日志中的错误信息

---

## 📊 测试数据

### Mock 响应映射

| URL 模式 | 响应类型 | 分数 | 状态 | Time Control |
|---------|---------|------|------|--------------|
| `google.com/search` | Time Control | 50% | Stay | ✅ true |
| `xiaohongshu.com` | Time Control | 50% | Stay | ✅ true |
| `weibo.com` | Block | 15% | Block | ❌ false |
| `bilibili.com` | Block | 15% | Block | ❌ false |
| `douyin.com` | Block | 15% | Block | ❌ false |
| `vercel.com/docs` | Stay | 85% | Stay | ❌ false |
| `github.com` | Stay | 85% | Stay | ❌ false |
| `gemini.google.com` | Stay | 85% | Stay | ❌ false |
| 其他 | Stay | 60% | Stay | ❌ false |

---

## ✅ 测试完成检查

测试完成后，请确保：

1. **禁用 Mocking**: 将 `IS_MOCKING_ENABLED` 改回 `false`
2. **重新加载 Extension**: 确保使用真实 API
3. **验证生产环境**: 测试真实 API 调用是否正常
4. **检查代码**: 确认没有遗留的调试代码

---

## 📝 测试报告模板

```
测试日期: [日期]
测试人员: [姓名]
Extension 版本: [版本号]

测试结果:
- [ ] 场景 1: Time Control UI ✅/❌
- [ ] 场景 2: Block UI ✅/❌
- [ ] 场景 3: Stay UI ✅/❌
- [ ] 场景 4: Popup 数据同步 ✅/❌
- [ ] 场景 5: 后台持续工作 ✅/❌
- [ ] 场景 6: 计时器功能 ✅/❌

发现的问题:
1. [问题描述]
2. [问题描述]

备注:
[其他说明]
```

---

*本文档会随着功能更新持续完善*





