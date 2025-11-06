# Bug 修复：标签页切换后 UI 不更新问题

## 问题描述

**现象**：
1. 暂停一次后，切换 tab，显示判定结果的 UI 界面不发生变化
2. 重新启动计时器切换 tab 后，判定界面始终显示为相关 "Stay"
3. 但是暂停后则显示"真实"的判定数据

## 根本原因分析

### 问题 1: Popup 关闭时监听器失效

**问题代码**：
```javascript
// ❌ 问题：这些监听器在 popup.js 中，当 popup 关闭时不会工作
chrome.tabs.onActivated.addListener(() => {
  updateCurrentSite();
  if (currentState !== 'input') {
    checkSiteRelevance();
  }
});
```

**原因**：
- Popup 关闭后，popup.js 中的事件监听器不会继续工作
- 当用户在 popup 关闭时切换标签页，监听器无法触发
- 当 popup 重新打开时，显示的是之前保存的旧数据

### 问题 2: Popup 重新打开时未刷新数据

**问题代码**：
```javascript
// ❌ 问题：popup 重新打开时，只加载保存的状态，不检查当前标签页
document.addEventListener('DOMContentLoaded', async () => {
  await loadSavedState();
  updateCurrentSite(); // 只更新 URL 显示，不检查相关性
  setupEventListeners();
});
```

**原因**：
- `loadSavedState()` 只恢复之前保存的状态（计时器、关键词等）
- 不会检查当前标签页的相关性
- 如果用户在 popup 关闭时切换了标签页，重新打开时仍显示旧标签页的数据

### 问题 3: 状态切换时数据不同步

**问题代码**：
```javascript
// ❌ 问题：切换状态时，两个状态的显示元素可能不同步
function showFocusedState() {
  // ... 切换显示 ...
  // 没有同步数据
}

function showPausedState() {
  // ... 切换显示 ...
  // 没有同步数据
}
```

**原因**：
- Focused state 和 Paused state 有各自的显示元素
- 切换状态时，如果数据不同步，会显示错误的数据
- 例如：focused state 显示的是旧标签页的数据，切换到 paused state 时可能显示另一个旧数据

## 修复方案

### ✅ 修复 1: Popup 打开时检查当前标签页

**修复代码**：
```javascript
// ✅ 修复：popup 打开时，如果不在 input 状态，检查当前标签页
document.addEventListener('DOMContentLoaded', async () => {
  await loadSavedState();
  await updateCurrentSite();
  setupEventListeners();
  
  // If not in input state, check current site relevance
  // This ensures data is fresh when popup reopens
  if (currentState !== 'input') {
    await checkSiteRelevance();
  }
});
```

**效果**：
- Popup 每次打开时，都会检查当前标签页的相关性
- 即使 popup 关闭时切换了标签页，重新打开时会显示正确的数据

### ✅ 修复 2: 添加数据同步函数

**修复代码**：
```javascript
// ✅ 修复：添加数据同步函数，确保两个状态显示相同的数据
function syncRelevanceData() {
  // Determine which state is currently visible and use it as source
  const isFocusedVisible = !focusedState.classList.contains('hidden');
  const isPausedVisible = !pausedState.classList.contains('hidden');
  
  if (isFocusedVisible) {
    // Copy from focused state to paused state
    const score = relevanceScoreDisplay.textContent;
    const status = statusDisplay.textContent;
    const site = currentSiteDisplay.textContent;
    
    if (score) relevanceScoreDisplayPaused.textContent = score;
    if (status) statusDisplayPaused.textContent = status;
    if (site) currentSiteDisplayPaused.textContent = site;
    
    relevanceScoreDisplayPaused.className = relevanceScoreDisplay.className;
    statusDisplayPaused.className = statusDisplay.className;
  } else if (isPausedVisible) {
    // Copy from paused state to focused state
    const score = relevanceScoreDisplayPaused.textContent;
    const status = statusDisplayPaused.textContent;
    const site = currentSiteDisplayPaused.textContent;
    
    if (score) relevanceScoreDisplay.textContent = score;
    if (status) statusDisplay.textContent = status;
    if (site) currentSiteDisplay.textContent = site;
    
    relevanceScoreDisplay.className = relevanceScoreDisplayPaused.className;
    statusDisplay.className = statusDisplayPaused.className;
  }
}
```

**效果**：
- 确保 focused state 和 paused state 始终显示相同的数据
- 切换状态时，数据会自动同步

### ✅ 修复 3: 状态切换时同步数据

**修复代码**：
```javascript
// ✅ 修复：切换状态时同步数据
function showFocusedState() {
  inputState.classList.add('hidden');
  focusedState.classList.remove('hidden');
  pausedState.classList.add('hidden');
  currentState = 'focused';
  
  // Sync data from paused state to focused state if paused state has newer data
  // This ensures data consistency when switching states
  syncRelevanceData();
}

function showPausedState() {
  inputState.classList.add('hidden');
  focusedState.classList.add('hidden');
  pausedState.classList.remove('hidden');
  currentState = 'paused';
  
  // Sync data from focused state to paused state
  // This ensures data consistency when switching states
  syncRelevanceData();
}
```

**效果**：
- 切换状态时，数据会自动同步
- 避免显示错误的数据

### ✅ 修复 4: 更新相关性时同步数据

**修复代码**：
```javascript
// ✅ 修复：更新相关性时，确保两个状态都更新
if (response && response.success && response.data) {
  const data = response.data;
  
  // Update relevance score (update both states to keep them in sync)
  const score = data.relevance_score_percent || 0;
  relevanceScoreDisplay.textContent = `${score}%`;
  relevanceScoreDisplayPaused.textContent = `${score}%`;
  
  // ... 更新状态 ...
  
  // Ensure both states are in sync
  syncRelevanceData();
}
```

**效果**：
- 每次更新相关性时，两个状态都会同步更新
- 确保数据一致性

### ✅ 修复 5: 改进标签页切换监听器

**修复代码**：
```javascript
// ✅ 修复：改进标签页切换监听器，添加注释说明限制
// Note: These listeners only work when popup is open
// When popup reopens, DOMContentLoaded will check current site
chrome.tabs.onActivated.addListener(async () => {
  await updateCurrentSite();
  if (currentState !== 'input') {
    await checkSiteRelevance();
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  // Only trigger on completed navigation
  if (changeInfo.status === 'complete') {
    await updateCurrentSite();
    if (currentState !== 'input') {
      await checkSiteRelevance();
    }
  }
});
```

**效果**：
- 当 popup 打开时，标签页切换会立即更新数据
- 添加了注释说明监听器的限制

## 测试验证

### 测试场景 1: Popup 关闭时切换标签页

**步骤**：
1. 启动专注会话（focused state）
2. 关闭 popup
3. 切换到不同的标签页
4. 重新打开 popup

**预期结果**：
- Popup 打开时，应该显示新标签页的相关性数据
- 不应该显示旧标签页的数据

### 测试场景 2: 暂停后切换标签页

**步骤**：
1. 启动专注会话
2. 暂停（paused state）
3. 切换到不同的标签页
4. 查看 paused state 的显示

**预期结果**：
- 应该显示新标签页的相关性数据
- 不应该显示旧标签页的数据

### 测试场景 3: 状态切换时数据同步

**步骤**：
1. 在 focused state 查看相关性数据
2. 暂停，切换到 paused state
3. 恢复，切换回 focused state

**预期结果**：
- 两个状态应该显示相同的数据
- 切换状态时不应该出现数据不一致

## 总结

这次修复解决了以下问题：
1. ✅ Popup 关闭时切换标签页，重新打开时显示旧数据
2. ✅ 状态切换时数据不同步
3. ✅ 标签页切换时 UI 不更新

**关键改进**：
- Popup 打开时自动检查当前标签页
- 添加数据同步机制
- 改进状态切换逻辑

**注意事项**：
- Popup 关闭时，标签页切换监听器不会工作（这是 Chrome Extension 的限制）
- 通过 popup 打开时检查当前标签页来解决这个问题
- 数据同步确保两个状态始终显示相同的数据

