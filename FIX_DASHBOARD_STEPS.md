# 在 Vercel Dashboard 中修复递归调用错误

## 问题

即使直接运行 `vercel dev` 也出现递归调用错误，说明问题在 **Vercel Dashboard 的项目设置** 中。

## 修复步骤（必须完成）

### 1. 访问 Vercel Dashboard

打开浏览器，访问：
```
https://vercel.com/dashboard
```

### 2. 找到你的项目

在项目列表中找到：
- **项目名：** `real-focus`
- 点击项目名称进入项目详情页

### 3. 进入项目设置

1. 点击顶部导航栏的 **"Settings"** 标签
2. 在左侧菜单中找到 **"General"** 选项
3. 点击进入 **General** 设置页面

### 4. 找到并清空 "Development Command"

1. 在 **General** 设置页面中，向下滚动
2. 找到 **"Development Command"** 字段
3. **删除或清空** 该字段中的所有内容（留空）
4. 点击页面底部的 **"Save"** 按钮保存

### 5. 验证修复

返回终端，运行：

```bash
vercel dev
```

应该看到：

```
Vercel CLI 48.8.2
...
Ready! Available at http://localhost:3000
```

## 为什么 `vercel.json` 无法修复？

`vercel.json` 文件中的配置**无法覆盖** Vercel Dashboard 中的项目设置。Dashboard 中的设置优先级更高。

## 临时解决方案（如果无法访问 Dashboard）

如果暂时无法访问 Dashboard，可以：

1. **使用不同的项目链接：**
   ```bash
   # 取消当前链接
   rm -rf .vercel
   
   # 重新链接（会创建新项目或链接到现有项目）
   vercel link
   ```

2. **或者等待 Dashboard 修复后再继续开发**

## 截图位置参考

在 Vercel Dashboard 中：
```
项目页面 → Settings → General → Development Command
```

找到这个字段并清空即可。

