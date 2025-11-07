# 30秒宽限期功能实现说明

## 功能概述

当 API 返回 `requires_time_control: true` 时，扩展会启动 30 秒宽限期，允许用户在干扰平台上短暂查看工作相关内容，之后强制拦截。

## 实现细节

### 1. Background Script (background.js)

#### 检测时间控制需求

在 `checkRelevance` 消息处理中，当收到 API 响应后：

```javascript
if (aiResult.requires_time_control === true) {
  // 启动 30 秒计时器
  // 通知 Content Script 显示倒计时
}
```

#### 计时器管理

- **启动计时器**：30 秒后检查用户是否仍在同一页面
- **清理计时器**：当用户导航到其他页面或关闭标签页时自动清理
- **强制拦截**：30 秒后如果仍在同一页面，发送 `forceBlock` 消息给 Content Script

#### 消息通信

- **发送给 Content Script**：
  - `showTimeControl`: 显示倒计时提示条
  - `forceBlock`: 强制拦截页面

### 2. Content Script (content.js)

#### 倒计时提示条

**功能**：
- 在页面顶部显示红色渐变提示条
- 实时显示剩余秒数（30秒倒计时）
- 包含提示消息："当前正在干扰平台进行搜索，你有 30 秒时间查看，之后将强制拦截"
- 提供关闭按钮（用于测试）

**样式**：
- 固定定位在页面顶部
- 红色渐变背景（`#ff6b6b` → `#ee5a6f`）
- 倒计时数字有脉冲动画效果
- 时间到后变为深红色（`#c92a2a`）

#### 强制拦截界面

**功能**：
- 30 秒后自动显示全屏拦截界面
- 显示拦截原因
- 提供"返回上一页"按钮
- 阻止所有页面交互

**样式**：
- 黑色半透明背景（`rgba(0, 0, 0, 0.95)`）
- 居中显示拦截信息
- 淡入动画效果

## 工作流程

### 场景 1：用户在干扰平台上搜索工作内容

1. **用户访问**：`https://xiaohongshu.com/search?q=vercel`
2. **API 响应**：返回 `requires_time_control: true`
3. **Background Script**：
   - 检测到时间控制需求
   - 启动 30 秒计时器
   - 发送 `showTimeControl` 消息给 Content Script
4. **Content Script**：
   - 显示倒计时提示条
   - 开始 30 秒倒计时
5. **30 秒后**：
   - Background Script 检查用户是否仍在同一页面
   - 如果仍在，发送 `forceBlock` 消息
   - Content Script 显示拦截界面

### 场景 2：用户在宽限期内离开页面

1. **用户访问**：干扰平台上的 Meta-Task 页面
2. **显示倒计时**：30 秒倒计时开始
3. **用户导航**：在 30 秒内离开该页面
4. **自动清理**：
   - `tabs.onUpdated` 事件触发
   - Background Script 清除计时器
   - Content Script 的倒计时提示条自动消失（页面已切换）

### 场景 3：正常页面（不需要时间控制）

1. **用户访问**：正常页面或合法工具网站
2. **API 响应**：返回 `requires_time_control: false` 或没有该字段
3. **正常处理**：执行常规的 Stay/Block 逻辑
4. **不显示倒计时**：不启动时间控制功能

## 代码位置

### Background Script

- **时间控制检测**：`background.js` 第 264-305 行
- **计时器管理**：`background.js` 第 7-8 行（全局变量），第 390-408 行（清理逻辑）

### Content Script

- **倒计时提示条**：`content.js` 第 163-304 行
- **强制拦截界面**：`content.js` 第 320-427 行
- **消息监听**：`content.js` 第 429-476 行

## 消息协议

### Background → Content Script

#### `showTimeControl`
```javascript
{
  action: 'showTimeControl',
  duration: 30, // seconds
  message: '当前正在干扰平台进行搜索，你有 30 秒时间查看，之后将强制拦截'
}
```

#### `forceBlock`
```javascript
{
  action: 'forceBlock',
  reason: '30秒宽限期已结束，已强制拦截该页面'
}
```

### Content Script → Background

#### `removeTimeControl` (可选)
```javascript
{
  action: 'removeTimeControl'
}
```

## 注意事项

1. **缓存处理**：`requires_time_control` 字段不会被缓存，每次都会重新检查
2. **计时器清理**：当用户导航或关闭标签页时，计时器会自动清理，避免内存泄漏
3. **页面状态检查**：30 秒后强制拦截前，会检查用户是否仍在同一页面
4. **用户体验**：倒计时提示条提供清晰的视觉反馈，让用户知道剩余时间

## 测试方法

### 手动测试

1. **安装扩展**
2. **访问干扰平台**：例如 `https://xiaohongshu.com/search?q=vercel`
3. **观察倒计时**：应该看到顶部红色提示条，显示 30 秒倒计时
4. **等待 30 秒**：应该看到拦截界面
5. **测试导航**：在 30 秒内导航到其他页面，计时器应该自动清理

### 自动化测试

可以使用 Chrome DevTools 的 Console 手动触发：

```javascript
// 在 Content Script 的上下文中
chrome.runtime.sendMessage({
  action: 'showTimeControl',
  duration: 5, // 测试用 5 秒
  message: '测试倒计时'
});

// 5 秒后手动触发拦截
setTimeout(() => {
  chrome.runtime.sendMessage({
    action: 'forceBlock',
    reason: '测试拦截'
  });
}, 5000);
```

## 未来改进

1. **可配置时长**：允许用户自定义宽限期时长（15秒、30秒、60秒等）
2. **暂停功能**：允许用户暂停倒计时（但需要限制暂停次数）
3. **统计功能**：记录用户在干扰平台上花费的时间
4. **提醒优化**：在倒计时最后 5 秒时显示更明显的提醒

