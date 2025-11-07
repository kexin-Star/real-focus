# Chrome 扩展测试指南

## 快速开始

### 1. 加载扩展

1. **打开 Chrome 扩展管理页面**
   - 在地址栏输入：`chrome://extensions/`
   - 或者：菜单 → 更多工具 → 扩展程序

2. **启用开发者模式**
   - 在页面右上角打开"开发者模式"开关

3. **加载未打包的扩展**
   - 点击"加载已解压的扩展程序"
   - 选择扩展目录：`/Users/kexin/real-focus/extension`
   - 点击"选择"

4. **确认扩展已加载**
   - 应该看到 "Real Focus Assistant" 扩展
   - 扩展图标会出现在浏览器工具栏

### 2. 配置 API 地址

扩展默认使用生产环境 API。如果需要使用本地 API：

1. **打开扩展的 background.js**
   - 找到 `callAIAPI` 函数（约第 192 行）
   - 修改 `apiUrl` 变量：
   ```javascript
   // 本地测试
   const apiUrl = 'http://localhost:3000/api/focus-assistant';
   
   // 或生产环境
   const apiUrl = 'https://real-focus-a79c571mm-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant';
   ```

2. **重新加载扩展**
   - 在 `chrome://extensions/` 页面
   - 点击扩展卡片上的"重新加载"按钮（🔄）

### 3. 设置专注主题

1. **点击扩展图标**
   - 在浏览器工具栏点击 Real Focus Assistant 图标
   - 打开扩展弹窗

2. **输入专注主题**
   - 在输入框中输入你的专注关键词
   - 例如：`我在用Claude做一个vibecoding的项目`
   - 点击"保存"或按 Enter

### 4. 测试场景

#### 场景 1：测试正常页面（应该通过）

1. **访问相关页面**
   - 例如：`https://vercel.com/usage`
   - 扩展会自动检测页面

2. **查看结果**
   - 如果页面相关，应该显示"Stay"状态
   - 可以在扩展弹窗中查看详细信息

#### 场景 2：测试干扰平台上的 Meta-Task 搜索（30秒宽限期）

1. **访问干扰平台**
   - 例如：`https://xiaohongshu.com/search?q=vercel`
   - 或：`https://weibo.com/account/usage`

2. **观察倒计时通知条**
   - 页面顶部应该出现 M3 风格的红色通知条
   - 显示倒计时：30秒、29秒、28秒...
   - 提示信息："当前正在干扰平台进行搜索，你有 30 秒时间查看，之后将强制拦截"

3. **等待 30 秒**
   - 观察倒计时变化
   - 最后 5 秒时，倒计时芯片变为红色

4. **查看拦截界面**
   - 30 秒后，应该显示全屏拦截界面
   - 显示：
     - 错误图标
     - "页面已被拦截"标题
     - 相关性得分：15%
     - AI 拦截理由
     - "返回上一页"按钮

#### 场景 3：测试普通干扰内容（应该直接阻止）

1. **访问干扰平台普通内容**
   - 例如：`https://xiaohongshu.com/discover/food`
   - 不包含 Meta-Task 关键词

2. **查看结果**
   - 应该直接显示"Block"状态
   - 不会显示 30 秒倒计时

### 5. 调试技巧

#### 查看 Background Script 日志

1. **打开 Service Worker 调试器**
   - 在 `chrome://extensions/` 页面
   - 找到 Real Focus Assistant 扩展
   - 点击"service worker"链接（或"检查视图"）

2. **查看 Console**
   - 在打开的开发者工具中查看 Console
   - 可以看到：
     - API 调用日志
     - 时间控制逻辑日志
     - 错误信息

#### 查看 Content Script 日志

1. **打开页面开发者工具**
   - 在测试页面上按 `F12` 或右键 → 检查
   - 切换到 Console 标签

2. **查看日志**
   - 可以看到 Content Script 的日志
   - 例如：`Real Focus Assistant content script loaded`

#### 检查消息传递

在 Background Script 的 Console 中，可以看到：
```
Time control required for: https://xiaohongshu.com/search?q=vercel
Meta-Task check: URL=..., Domain=..., isMetaTask=...
```

在 Content Script 的 Console 中，可以看到：
```
Real Focus Assistant content script loaded
```

### 6. 常见问题排查

#### 问题 1：扩展没有响应

**解决方案**：
1. 检查扩展是否已启用
2. 重新加载扩展
3. 检查 Background Script 是否有错误（查看 Service Worker 控制台）

#### 问题 2：倒计时通知条没有显示

**可能原因**：
1. API 没有返回 `requires_time_control: true`
2. Content Script 没有正确加载
3. 消息传递失败

**排查步骤**：
1. 检查 Background Script 日志，确认是否发送了 `timer_start` 消息
2. 检查 Content Script 日志，确认是否收到消息
3. 检查 API 响应，确认是否包含 `requires_time_control: true`

#### 问题 3：拦截界面没有显示

**可能原因**：
1. 30 秒内用户离开了页面
2. 计时器被清理
3. 消息传递失败

**排查步骤**：
1. 在 Background Script 中查看计时器是否正常启动
2. 检查 30 秒后是否发送了 `block_page` 消息
3. 检查 Content Script 是否收到消息

#### 问题 4：API 调用失败

**可能原因**：
1. API 地址配置错误
2. 网络问题
3. API 服务器未运行（如果使用本地 API）

**排查步骤**：
1. 检查 `background.js` 中的 API 地址
2. 在 Background Script Console 中查看错误信息
3. 如果使用本地 API，确保本地服务器正在运行：
   ```bash
   npm run local
   ```

### 7. 测试检查清单

- [ ] 扩展已成功加载
- [ ] 扩展图标出现在工具栏
- [ ] 可以打开扩展弹窗
- [ ] 可以设置专注主题
- [ ] 访问正常页面时，扩展正常工作
- [ ] 访问干扰平台上的 Meta-Task 页面时，显示倒计时通知条
- [ ] 倒计时正常进行（30秒 → 0秒）
- [ ] 30 秒后显示拦截界面
- [ ] 拦截界面显示正确的得分和理由
- [ ] "返回上一页"按钮正常工作
- [ ] 在 30 秒内离开页面时，计时器自动清理

### 8. 手动测试消息

可以在浏览器 Console 中手动测试消息传递：

#### 测试倒计时通知条

在页面的 Console 中（Content Script 上下文）：
```javascript
// 模拟接收 timer_start 消息
chrome.runtime.sendMessage({
  action: 'timer_start',
  duration: 5, // 测试用 5 秒
  message: '测试倒计时'
});
```

#### 测试拦截界面

在页面的 Console 中：
```javascript
// 模拟接收 block_page 消息
chrome.runtime.sendMessage({
  action: 'block_page',
  reason: '测试拦截理由：这是一个测试',
  score: 15
});
```

### 9. 重新加载扩展

每次修改代码后，需要重新加载扩展：

1. **方法 1：使用重新加载按钮**
   - 在 `chrome://extensions/` 页面
   - 点击扩展卡片上的"重新加载"按钮（🔄）

2. **方法 2：使用快捷键**
   - 在扩展管理页面按 `Ctrl+R` (Windows/Linux) 或 `Cmd+R` (Mac)

3. **刷新测试页面**
   - 重新加载扩展后，刷新正在测试的页面
   - 确保 Content Script 使用最新代码

### 10. 测试最佳实践

1. **使用本地 API 进行开发**
   - 修改代码后，使用本地 API 快速测试
   - 避免等待 Vercel 部署

2. **使用生产 API 进行最终验证**
   - 确认功能正常后，切换到生产 API
   - 验证部署后的功能

3. **测试多个场景**
   - 正常页面
   - 干扰平台上的 Meta-Task 搜索
   - 干扰平台上的普通内容
   - 不同域名和 URL 格式

4. **检查控制台日志**
   - 定期查看 Background Script 和 Content Script 的日志
   - 及时发现和解决问题

## 快速测试命令

### 启动本地 API 服务器

```bash
# 在项目根目录
npm run local
```

### 测试 API（验证功能）

```bash
# 测试时间控制功能
LOCAL_TEST=true node test-time-control.js

# 交互式测试
npm run test:local
```

## 相关文档

- `INSTALL.md` - 扩展安装说明
- `TESTING_GUIDE.md` - 详细测试指南
- `M3_TIME_CONTROL.md` - M3 风格 UI 说明
- `TIME_CONTROL_IMPLEMENTATION.md` - 时间控制实现说明

