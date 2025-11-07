# 关于 `package.json` 中的 `"dev": "vercel dev"`

## ✅ 这是正常的，不是问题！

`package.json` 中的：

```json
{
  "scripts": {
    "dev": "vercel dev"
  }
}
```

**这是完全正常的配置**，它只是定义了一个 npm 脚本，让你可以通过 `npm run dev` 来运行 `vercel dev`。

## ❌ 真正的问题在哪里？

真正的问题在于 **Vercel Dashboard 中的项目设置**，具体是：

**Settings → General → Framework Settings → Development Command**

如果这个字段被设置为：
- `vercel dev`
- `npm run dev`
- 或其他会调用 `vercel dev` 的命令

就会导致递归调用。

## 🔍 如何确认问题

即使 Dashboard 显示为 "None"，问题可能仍然存在，因为：

1. **可能有多个项目**：你可能链接到了不同的项目
2. **缓存问题**：本地 `.vercel` 目录可能有旧配置
3. **项目设置未同步**：Dashboard 显示和实际设置可能不一致

## 🔧 解决方案

### 方案 1：检查并修复 Dashboard 设置（推荐）

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 找到项目 `real-focus`（注意：项目 ID 是 `prj_jRDnYI2Wcufesy2BMlVpHeqqDVMQ`）
3. 进入 **Settings → General → Framework Settings**
4. 找到 **Development Command** 字段
5. **确保该字段完全为空**（不是 "None"，而是完全空白）
6. 如果旁边有 **Override** 开关，确保它是**关闭**状态
7. 点击 **Save** 保存

### 方案 2：临时绕过（不推荐）

如果暂时无法修复 Dashboard，可以：

1. **直接使用 `vercel dev`**（不使用 `npm run dev`）
2. 或者修改 `package.json` 中的脚本为其他命令（但这只是绕过，不是真正修复）

### 方案 3：重新创建项目链接

```bash
# 删除本地链接
rm -rf .vercel

# 重新链接（选择正确的项目）
vercel link
```

## 📝 总结

- ✅ `package.json` 中的 `"dev": "vercel dev"` 是正常的
- ❌ 问题在 Vercel Dashboard 的项目设置中
- 🔧 需要在 Dashboard 中清空 "Development Command" 字段

