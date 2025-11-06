# 安装指南

## 快速开始

1. **打开 Chrome 扩展管理页面**
   - 在 Chrome 地址栏输入：`chrome://extensions/`
   - 或：菜单 → 更多工具 → 扩展程序

2. **启用开发者模式**
   - 打开页面右上角的"开发者模式"开关

3. **加载扩展**
   - 点击"加载已解压的扩展程序"
   - 选择 `extension` 文件夹（包含 manifest.json 的文件夹）
   - 点击"选择文件夹"

4. **开始使用**
   - 点击 Chrome 工具栏中的扩展图标
   - 输入你的任务关键词
   - 点击"Start Focus"开始专注

## 功能说明

### Frame 1: 输入状态
- 输入你当前专注的任务关键词
- 点击"Start Focus"开始

### Frame 2: 专注状态
- 显示任务主题（可编辑）
- 计时器（可暂停）
- 当前网站 URL
- AI 相关度分析（百分比）
- 状态标签（Stay/Block）

### Frame 3: 暂停状态
- 与 Frame 2 相同，但计时器处于暂停状态
- 点击播放按钮恢复

## API 配置

确保 `popup.js` 中的 API URL 正确：

```javascript
const apiUrl = 'https://real-focus-a79c571mm-kexins-projects-f8f51bd8.vercel.app/api/focus-assistant';
```

如果需要更新 API URL，编辑 `popup.js` 文件中的 `checkSiteRelevance()` 函数。

## 故障排除

### 扩展无法加载
- 确保所有文件都在 `extension` 文件夹中
- 检查 `manifest.json` 语法是否正确
- 查看 Chrome 扩展页面的错误信息

### API 调用失败
- 检查网络连接
- 确认 API URL 正确
- 查看浏览器控制台错误信息（F12 → Console）

### 计时器不工作
- 刷新扩展页面
- 重新加载扩展

## 文件清单

确保以下文件存在：
- ✅ manifest.json
- ✅ popup.html
- ✅ popup.css
- ✅ popup.js
- ✅ background.js
- ✅ content.js

