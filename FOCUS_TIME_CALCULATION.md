# Focus Time of Today - 计时方式说明

> 最后更新: 2025-01-XX

## 📋 概述

本文档详细说明 "Focus time of today"（今日专注时长）的计算方式、更新时机和存储机制。

---

## 🗄️ 存储机制

### 数据结构

**存储键**: `focusStatistics` (Chrome Storage Local)

**数据结构**:
```javascript
{
  total_focused_time: number,  // 累计专注时长（毫秒）
  blocked_count: number        // 累计拦截次数
}
```

### 存储位置

- **文件**: `extension/background.js`
- **常量**: `STATISTICS_KEY = 'focusStatistics'`
- **函数**: 
  - `getStatistics()` - 获取统计数据
  - `updateStatistics(stats)` - 更新统计数据

---

## ⏱️ 计时方式

### 当前实现

**重要说明**: 虽然 UI 显示为 "Focus time of today"，但实际存储的是**累计专注时长**，不是按日期重置的"今日"时长。

### 计算方式

专注时长的计算基于 **Focus 会话的实际运行时间**：

```javascript
// 会话时长计算
const now = Date.now();
const sessionDuration = now - state.start_time; // 毫秒

// 累加到总时长
total_focused_time = stats.total_focused_time + sessionDuration;
```

**计算公式**:
- `sessionDuration = 当前时间 - 会话开始时间`
- `total_focused_time = 之前的累计时长 + 本次会话时长`

---

## 🔄 更新时机

专注时长在以下情况下会被累加：

### 1. Focus 会话自动结束（切换到 Break）

**触发时机**: Focus 倒计时结束，自动切换到 Break

**代码位置**: `background.js:1024-1039` (`handleEndFocus`)

```javascript
// 计算本次会话时长
const sessionDuration = now - state.start_time;

// 累加到统计数据
await updateStatistics({
  total_focused_time: stats.total_focused_time + sessionDuration
});
```

### 2. 用户暂停 Focus 会话

**触发时机**: 用户点击 "Pause" 按钮

**代码位置**: `background.js:774-786` (`pause_focus` action)

```javascript
// 计算本次会话时长（从开始到暂停）
const sessionDuration = now - state.start_time;

// 累加到统计数据
await updateStatistics({
  total_focused_time: stats.total_focused_time + sessionDuration
});
```

**注意**: 暂停时立即累加，恢复后重新开始计时（不重复计算）

### 3. 用户停止 Focus 会话

**触发时机**: 用户点击 "Stop" 按钮

**代码位置**: `background.js:847-858` (`stop_focus` action)

```javascript
// 如果正在运行（非暂停状态），累加本次会话时长
if (state && state.session_type === 'FOCUS' && state.status !== 'PAUSED') {
  const sessionDuration = now - state.start_time;
  await updateStatistics({
    total_focused_time: stats.total_focused_time + sessionDuration
  });
}
```

### 4. 开始 Break 会话（手动）

**触发时机**: 用户手动开始 Break（如果从 Break 切换到 Focus）

**代码位置**: `background.js:622-634` (`start_break` action)

```javascript
// 如果从 Focus 切换到 Break，累加本次 Focus 会话时长
if (state && state.session_type === 'FOCUS') {
  const sessionDuration = now - state.start_time;
  await updateStatistics({
    total_focused_time: stats.total_focused_time + sessionDuration
  });
}
```

---

## 📊 显示方式

### UI 显示

**位置**: Popup UI 右侧统计区域

**显示格式**:
- 如果 `total_focused_time >= 60000` (≥1分钟): 显示 `${minutes}m` (如 "13m")
- 如果 `total_focused_time < 60000` (<1分钟): 显示 `<1m`

**代码位置**: `ui-manager.js:183-194`

```javascript
function updateStatisticsDisplay(todayFocusTime, blockedCount) {
  if (todayFocusTime !== undefined) {
    const minutes = Math.floor(todayFocusTime / 60000);
    const timeText = minutes > 0 ? `${minutes}m` : '<1m';
    if (UIElements.todayFocusTime) {
      UIElements.todayFocusTime.textContent = timeText;
    }
  }
}
```

### 数据获取

**获取方式**: 通过 `getPopupState` 消息从 Background Script 获取

**代码位置**: 
- `popup.js:68-102` (`updateStatistics`)
- `background.js:535-558` (`getPopupState` action)

---

## ⚠️ 当前限制

### 1. 不是真正的"今日"时长

**问题**: 
- 变量名是 `todayFocusTime`，但实际存储的是**累计专注时长**
- 不会按日期重置
- 跨天使用时，会继续累加

**示例**:
- 第一天专注 30 分钟 → `total_focused_time = 1800000` (30分钟)
- 第二天专注 20 分钟 → `total_focused_time = 3000000` (50分钟)
- UI 显示: "50m"（不是"20m"）

### 2. 没有日期过滤

**问题**:
- 统计数据中没有日期字段
- 无法区分不同日期的专注时长
- 无法实现"今日"、"本周"、"本月"等统计

---

## 🔍 计时逻辑详解

### 会话时长计算

```javascript
// 会话开始时间（Focus 会话开始时设置）
state.start_time = Date.now(); // 例如: 1704067200000

// 会话结束时间（暂停/停止/自动结束）
const now = Date.now(); // 例如: 1704067800000

// 计算会话时长
const sessionDuration = now - state.start_time; // 600000 (10分钟，600秒)
```

### 累加逻辑

```javascript
// 获取当前累计时长
const stats = await getStatistics();
// stats.total_focused_time = 1800000 (30分钟)

// 累加本次会话时长
await updateStatistics({
  total_focused_time: stats.total_focused_time + sessionDuration
  // 1800000 + 600000 = 2400000 (40分钟)
});
```

### 暂停/恢复处理

**暂停时**:
- 立即计算并累加从开始到暂停的时长
- 例如: 开始 10:00，暂停 10:15 → 累加 15 分钟

**恢复时**:
- 重新设置 `start_time = now`
- 不累加暂停期间的时间
- 例如: 恢复 10:20，继续计时到 10:35 → 累加 15 分钟
- 总计: 15 + 15 = 30 分钟

---

## 📝 更新流程图

```
[开始 Focus 会话]
    ↓
设置 start_time = now
    ↓
[用户操作]
    ├─ [暂停] → 计算 sessionDuration → 累加到 total_focused_time
    ├─ [停止] → 计算 sessionDuration → 累加到 total_focused_time
    └─ [自动结束] → 计算 sessionDuration → 累加到 total_focused_time
    ↓
[统计数据更新]
    ↓
[UI 显示更新]
    ├─ 从 total_focused_time 计算分钟数
    └─ 显示格式: "13m" 或 "<1m"
```

---

## 🔧 相关代码位置

### Background Script (`background.js`)

- **统计存储键**: `STATISTICS_KEY = 'focusStatistics'` (line 22)
- **获取统计**: `getStatistics()`` (line 941-953)
- **更新统计**: `updateStatistics(stats)` (line 960-973)
- **更新时机**:
  - `handleEndFocus()` (line 1024-1086) - Focus 自动结束
  - `pause_focus` action (line 774-808) - 暂停
  - `stop_focus` action (line 847-871) - 停止
  - `start_break` action (line 622-670) - 开始 Break

### Popup (`popup.js`)

- **更新统计**: `updateStatistics()` (line 68-102)
- **调用时机**: 每 10 秒自动更新一次（在 `startTimer` 中）

### UI Manager (`ui-manager.js`)

- **显示更新**: `updateStatisticsDisplay()` (line 183-194)
- **格式转换**: 毫秒 → 分钟显示

---

## 💡 潜在改进建议

### 1. 实现真正的"今日"统计

**方案**: 在统计数据中添加日期字段

```javascript
{
  total_focused_time: number,
  blocked_count: number,
  last_reset_date: string,  // "2025-01-XX"
  daily_stats: {
    "2025-01-XX": {
      focused_time: number,
      blocked_count: number
    }
  }
}
```

**实现**:
- 每次更新时检查日期
- 如果日期变化，重置或创建新的日期记录
- 显示时只显示当天的数据

### 2. 添加周/月统计

**方案**: 扩展数据结构，支持多时间维度统计

### 3. 添加统计历史

**方案**: 保留历史数据，支持查看过去几天的统计

---

## 📊 当前行为总结

| 操作 | 是否累加时长 | 计算方式 |
|------|-------------|---------|
| Focus 自动结束 | ✅ 是 | `now - start_time` |
| 暂停 Focus | ✅ 是 | `now - start_time` |
| 停止 Focus | ✅ 是（如果正在运行） | `now - start_time` |
| 恢复 Focus | ❌ 否 | 重新开始计时 |
| Break 会话 | ❌ 否 | 不计算专注时长 |

---

*本文档会随着功能更新持续维护*




