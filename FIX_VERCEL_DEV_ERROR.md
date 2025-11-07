# 修复 `vercel dev` 递归调用错误

## 错误信息

```
Error: `vercel dev` must not recursively invoke itself. 
Check the Development Command in the Project Settings or the `dev` script in `package.json`
```

## 原因

Vercel 项目设置中的 **"Development Command"** 被设置为 `vercel dev` 或 `npm run dev`，导致无限递归调用。

## 解决方案

### 方法 1：在 Vercel Dashboard 中修复（推荐）

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目（`real-focus`）
3. 进入 **Settings** → **General**
4. 找到 **"Development Command"** 字段
5. **清空或删除** 该字段（留空）
6. 点击 **Save**

### 方法 2：直接使用 `vercel dev` 命令

不使用 `npm run dev`，直接运行：

```bash
vercel dev
```

### 方法 3：使用 Vercel CLI 更新项目设置

```bash
# 查看当前项目设置
vercel project ls

# 如果需要，可以重新链接项目
vercel link
```

## 验证修复

修复后，运行：

```bash
npm run dev
```

应该看到：

```
Vercel CLI 48.8.2
...
Ready! Available at http://localhost:3000
```

而不是递归调用错误。

## 为什么会出现这个问题？

当你在 Vercel Dashboard 中设置了 "Development Command" 为 `vercel dev` 时：
- `npm run dev` → 执行 `vercel dev`
- `vercel dev` → 读取项目设置 → 执行 "Development Command" (`vercel dev`)
- 无限循环！

**解决方案：** 清空 "Development Command" 字段，让 Vercel 使用默认行为。

