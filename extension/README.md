# Real Focus Assistant - Chrome Extension

Material Design 3 风格的专注助手 Chrome 扩展。

## 文件结构

```
extension/
├── manifest.json       # Manifest V3 配置
├── popup.html          # 弹出窗口 HTML
├── popup.css           # Material Design 3 样式
├── popup.js            # 弹出窗口逻辑
├── background.js       # 后台服务工作者
├── content.js          # 内容脚本
└── README.md           # 说明文档
```

## 安装步骤

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `extension` 文件夹

## 功能特性

- **Frame 1 (输入状态)**: 输入任务关键词，开始专注会话
- **Frame 2 (专注状态)**: 显示计时器、当前网站和相关度分析
- **Frame 3 (暂停状态)**: 暂停计时，显示相关度分析

## API 配置

在 `popup.js` 中，确保 API URL 指向你的 Vercel 部署：

```javascript
const apiUrl = 'https://your-vercel-url/api/focus-assistant';
```

## 设计规范

- **主背景色**: #F8F6F0 (浅米棕色)
- **主色调**: #B5A7C4 (淡紫色)
- **状态色**:
  - Stay: #A8E6CF (绿色)
  - Block: #FF9999 (红色)
- **圆角**: 容器 16px, 按钮/输入框 8px
- **字体**: system-ui, sans-serif

## 图标文件

需要创建以下图标文件：
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

或者修改 `manifest.json` 移除图标引用。

