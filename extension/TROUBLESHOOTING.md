# 扩展问题排查指南

## 问题：暂停/恢复计时器时判定结果改变

### 可能的原因

#### 1. 加载了旧版本的扩展包 ⚠️ **最可能的原因**

**症状**：
- 点击暂停或恢复按钮时，相关性得分和状态会改变
- 即使网站内容没有变化

**解决方案**：
1. **检查当前加载的扩展版本**
   - 打开 `chrome://extensions/`
   - 找到 Real Focus Assistant 扩展
   - 查看扩展的版本号和文件路径

2. **重新加载最新版本的扩展**
   ```bash
   # 确保使用最新的代码
   cd /Users/kexin/real-focus/extension
   # 检查文件修改时间
   ls -la popup.js background.js content.js
   ```

3. **在 Chrome 中重新加载扩展**
   - 在 `chrome://extensions/` 页面
   - 点击扩展卡片上的"重新加载"按钮（🔄）
   - 或者移除扩展后重新加载

4. **验证修复**
   - 打开扩展 popup
   - 点击暂停按钮
   - **验证**：相关性得分和状态应该**保持不变**

#### 2. 代码逻辑问题（已修复）

**当前代码状态**：
- ✅ `handlePause()` - **不**调用 `checkSiteRelevance()`
- ✅ `handleResume()` - **不**调用 `checkSiteRelevance()`
- ✅ 有明确的注释说明为什么不应该调用

**检查方法**：
1. 打开 `extension/popup.js`
2. 搜索 `handlePause` 函数（约第177行）
3. 确认函数中**没有** `checkSiteRelevance()` 调用
4. 搜索 `handleResume` 函数（约第196行）
5. 确认函数中**没有** `checkSiteRelevance()` 调用

#### 3. Popup 重新打开导致刷新

**可能的情况**：
- 点击暂停/恢复时，popup 窗口可能意外关闭和重新打开
- `DOMContentLoaded` 事件会触发，导致重新检查

**检查方法**：
1. 打开 Background Script Console（`chrome://extensions/` → 点击 service worker）
2. 观察是否有重复的 API 调用日志
3. 如果看到多次调用，可能是 popup 重新打开导致的

**解决方案**：
- 这是正常行为（popup 重新打开时应该刷新数据）
- 但如果 popup 不应该关闭，可能是其他问题

#### 4. Tab 监听器意外触发

**可能的情况**：
- `chrome.tabs.onActivated` 或 `chrome.tabs.onUpdated` 监听器被意外触发
- 导致在暂停/恢复时重新检查相关性

**检查方法**：
1. 在 Background Script Console 中查看日志
2. 观察是否有 "Tab activated" 或 "Tab updated" 日志
3. 确认这些日志是否在暂停/恢复时出现

**解决方案**：
- 这些监听器应该只在真正的 tab 切换或页面导航时触发
- 如果意外触发，需要检查监听器逻辑

### 验证步骤

#### 步骤 1：确认使用最新代码

```bash
cd /Users/kexin/real-focus/extension
# 检查 popup.js 中是否有正确的注释
grep -A 5 "handlePause" popup.js | grep -i "do not call"
```

应该看到：
```
  // IMPORTANT: Do NOT call checkSiteRelevance() here
```

#### 步骤 2：重新加载扩展

1. 打开 `chrome://extensions/`
2. 找到 Real Focus Assistant
3. 点击"重新加载"按钮（🔄）
4. 确认没有错误提示

#### 步骤 3：测试验证

1. **打开扩展 popup**
2. **输入关键词并启动**（例如：`我在用Claude做一个vibecoding的项目`）
3. **访问一个测试页面**（例如：`https://vercel.com/usage`）
4. **记录相关性得分和状态**（例如：70%, Stay）
5. **点击暂停按钮**
6. **验证**：相关性得分和状态应该**保持不变**（仍然是 70%, Stay）
7. **点击恢复按钮**
8. **验证**：相关性得分和状态应该**保持不变**（仍然是 70%, Stay）

#### 步骤 4：检查控制台日志

1. **打开 Background Script Console**
   - `chrome://extensions/` → 点击 service worker 链接

2. **观察 API 调用**
   - 点击暂停时，**不应该**看到新的 API 调用
   - 点击恢复时，**不应该**看到新的 API 调用
   - 只有在以下情况才应该看到 API 调用：
     - 首次启动专注会话
     - 切换到新标签页
     - 页面导航

### 如果问题仍然存在

#### 方法 1：完全重新安装扩展

1. 在 `chrome://extensions/` 中移除扩展
2. 关闭所有 Chrome 窗口
3. 重新打开 Chrome
4. 重新加载扩展

#### 方法 2：检查是否有多个版本

1. 检查是否有多个扩展目录
2. 确认加载的是正确的目录：`/Users/kexin/real-focus/extension`

#### 方法 3：检查缓存

1. 清除扩展的存储数据
   - 在 Background Script Console 中运行：
   ```javascript
   chrome.storage.local.clear(() => {
     console.log('Storage cleared');
   });
   ```

2. 重新测试

### 正确的行为

#### ✅ 应该触发相关性检查的情况

1. **首次启动专注会话**
   - 用户输入关键词并点击 "Start Focus"
   - ✅ 应该检查当前网站相关性

2. **切换到新标签页**
   - 用户切换到不同的标签页
   - ✅ 应该检查新网站相关性

3. **页面导航**
   - 用户在同一个标签页中导航到新页面
   - ✅ 应该检查新页面相关性

4. **Popup 重新打开**
   - Popup 关闭后重新打开
   - ✅ 应该刷新当前网站的相关性（确保数据是最新的）

#### ❌ 不应该触发相关性检查的情况

1. **点击暂停按钮**
   - ❌ 不应该重新检查相关性
   - 只是暂停计时器，网站内容没有变化

2. **点击恢复按钮**
   - ❌ 不应该重新检查相关性
   - 只是恢复计时器，网站内容没有变化

3. **状态切换**（focused ↔ paused）
   - ❌ 不应该重新检查相关性
   - 只是 UI 状态切换，不应该触发新的分析

### 代码检查清单

确认以下代码是正确的：

```javascript
// ✅ handlePause() - 应该没有 checkSiteRelevance() 调用
async function handlePause() {
  // ... 暂停逻辑 ...
  showPausedState();
  // 不应该有: await checkSiteRelevance();
}

// ✅ handleResume() - 应该没有 checkSiteRelevance() 调用
async function handleResume() {
  // ... 恢复逻辑 ...
  showFocusedState();
  startTimer();
  // 不应该有: await checkSiteRelevance();
}
```

### 相关文件

- `extension/popup.js` - 主逻辑文件
- `extension/BUGFIX_STATUS.md` - 问题修复记录
- `extension/ISSUE_ANALYSIS.md` - 详细问题分析

