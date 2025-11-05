# 推送到 GitHub - 认证问题解决

## 问题
GitHub 已不再支持密码认证，需要使用 **Personal Access Token (PAT)**。

## 解决方案：创建 Personal Access Token

### 步骤 1: 创建 Token

1. 访问 GitHub Settings: https://github.com/settings/tokens
2. 点击 **Generate new token** → **Generate new token (classic)**
3. 设置 Token 信息：
   - **Note**: `Vercel Deployment` (或任何描述性名称)
   - **Expiration**: 选择过期时间（建议 90 天或更长）
   - **Scopes**: 勾选 `repo` (完整仓库访问权限)
4. 点击 **Generate token**
5. **重要**: 立即复制 token（类似 `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`），之后无法再查看

### 步骤 2: 使用 Token 推送

当系统提示输入密码时，**粘贴你的 Personal Access Token**（不是你的 GitHub 密码）。

```bash
git push -u origin main
```

输入用户名：`kexin-Star`  
输入密码：`粘贴你的 Personal Access Token`

## 替代方案：使用 SSH（推荐长期使用）

### 步骤 1: 检查是否有 SSH key

```bash
ls -al ~/.ssh
```

### 步骤 2: 生成 SSH key（如果没有）

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

按 Enter 使用默认路径，可以选择设置密码或留空。

### 步骤 3: 复制 SSH public key

```bash
cat ~/.ssh/id_ed25519.pub
```

### 步骤 4: 添加到 GitHub

1. 访问: https://github.com/settings/keys
2. 点击 **New SSH key**
3. 粘贴你的 public key
4. 点击 **Add SSH key**

### 步骤 5: 更改远程 URL 为 SSH

```bash
git remote set-url origin git@github.com:kexin-Star/real-focus.git
```

### 步骤 6: 推送

```bash
git push -u origin main
```

## 快速命令（使用 HTTPS + Token）

如果你选择使用 Personal Access Token：

```bash
# 重新推送（使用 token 作为密码）
git push -u origin main
```

## 验证推送成功

推送成功后，访问：
https://github.com/kexin-Star/real-focus

你应该能看到所有文件都已上传！

