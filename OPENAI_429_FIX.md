# OpenAI API 429 错误解决方案

## 问题诊断

即使 usage 显示 0，仍然收到 429 错误，通常是因为：

### 1. 新账户需要添加支付方式

OpenAI 的新账户需要：
- 添加支付方式（即使使用免费额度）
- 完成账户验证

**解决步骤：**
1. 访问 [OpenAI Billing](https://platform.openai.com/account/billing)
2. 点击 "Add payment method"
3. 添加信用卡或支付方式
4. 即使不充值，也可能需要这个步骤来激活账户

### 2. 检查账户状态

访问以下页面检查：
- [Usage Dashboard](https://platform.openai.com/usage) - 查看使用情况
- [Billing Overview](https://platform.openai.com/account/billing/overview) - 查看账单和配额
- [API Keys](https://platform.openai.com/api-keys) - 确认 API key 有效

### 3. 检查 API Key 类型

确保你使用的是：
- ✅ **API Key**（不是 Organization Key）
- ✅ 具有正确的权限
- ✅ 未过期或被撤销

### 4. 临时解决方案：使用其他模型

如果问题持续，可以尝试：
- 检查是否有其他可用的 OpenAI 账户
- 或者暂时使用其他 AI 服务（如 Anthropic Claude）

## 验证步骤

### 测试 API Key（本地）

```bash
# 使用已下载的 .env.local
node test-openai-key.js
```

### 检查 Vercel 环境变量

```bash
vercel env ls
```

确认 `OPENAI_API_KEY` 在所有环境（Development, Preview, Production）中都有配置。

## 常见 429 错误原因

| 原因 | 解决方案 |
|------|---------|
| 新账户未添加支付方式 | 添加支付方式激活账户 |
| 免费额度已用完 | 添加支付方式并充值 |
| 速率限制 | 等待一段时间后重试 |
| API Key 无效 | 重新生成 API Key |

## 下一步

1. ✅ 访问 [OpenAI Billing](https://platform.openai.com/account/billing) 添加支付方式
2. ✅ 等待几分钟让账户激活
3. ✅ 重新测试 API

如果问题仍然存在，可能需要：
- 联系 OpenAI 支持
- 或使用其他 AI 服务提供商

