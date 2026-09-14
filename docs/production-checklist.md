# yanxue-pricing-lab 生产上线验收清单

本文档用于现有 Cloudflare Pages 生产项目的上线验收。目标项目是
`y914426-byte/yanxue-pricing-lab`，不创建新的 Pages 项目或 D1 数据库。

## 1. 保持现有 Cloudflare Pages 项目

在 Cloudflare Dashboard 中确认 Pages 项目仍然是当前生产项目，并确认本次部署使用
`main`。不要新建项目、不要切换到新的数据库。

## 2. 确认 D1 binding

确认 Pages Functions 的 D1 binding 名称仍为 `DB`，且绑定的是原生产 D1 数据库。
如果 binding 不存在，先修复 binding，再进行功能验收。不要在本项目中写入新的数据库
名称，也不要重建 D1。

## 3. 只应用尚未执行的 migration

先在现有数据库上查看远程 migration 状态。数据库名称必须从现有 Cloudflare 项目配置
中读取，不能猜测：

```bash
wrangler d1 migrations list <现有数据库名称> --remote
```

第一至第四阶段已经上线的环境中，`0000`–`0007` 应当已经执行。第五阶段只新增：

```text
0008_last_edwin_jarvis.sql
```

例如确认状态后，可对同一个现有数据库执行：

```bash
wrangler d1 migrations apply <现有数据库名称> --remote
```

只有当远程列表明确只剩 `0008_last_edwin_jarvis.sql` 时，才执行 apply。绝对不要删除
数据库、重建数据库、清空数据或重跑已经执行的 `0000`–`0007`。如果 migration 记录与
实际表结构不一致，立即停止写操作并先核验生产 schema。

## 4. 配置生产变量

在 Cloudflare Pages 的生产环境配置以下变量。真实 API key 只能作为 Secret，不得提交
到 GitHub：

```text
OPENAI_API_KEY=<生产 Secret>
AI_ANALYSIS_MODEL=deepseek-v4-flash
OPENAI_API_BASE=https://api.deepseek.com
```

同时确认原有 `GOOGLE_CLIENT_ID` 和 `PRICE_ADMIN_EMAILS` 仍然存在，不要覆盖已有值。

## 5. 部署并打开管理员系统检查

重新部署现有 Pages 项目后，用 `PRICE_ADMIN_EMAILS` 中的 Google 账号访问：

```text
/admin/system-check
```

该页面只做配置和 D1 只读检查，不会发送 OpenAI 测试 Prompt，也不会自动执行 migration。
页面不会显示 API key、Cookie、owner ID 或 Cloudflare 内部错误。普通用户和未登录用户
不能查看该页面。

检查以下项目：Google 登录、OpenAI key/model/API、`DB` binding、D1 只读查询，以及
`estimates`、`google_sessions`、`price_catalogs`、`price_items`、`scheme_documents`、
`scheme_analyses`、`scheme_cost_estimates`、`activity_cost_templates`、
`scheme_learning_feedback`、`scheme_confirmed_costs`、`activity_aliases`、
`cost_price_aliases`、`activity_alias_feedback`。缺少方案分析表提示执行 0005，缺少成本
快照表提示执行 0006，缺少第四阶段学习表提示执行 0007，缺少活动语义反馈表提示执行
`0008_last_edwin_jarvis.sql`。

## 6. 人工功能验收

### 测试 1：登录

使用 Google 账号登录，确认登录成功、历史方案仍存在、价格库仍存在。

### 测试 2：导入方案

上传一份真实 DOCX，确认解析成功、保存成功，并且在“我的方案”中可看到。

### 测试 3：AI 分析

打开方案详情，点击“智能分析成本”。确认返回团型、人数、活动和待确认项。确认任何
成本项目都没有 AI 生成的单价或总价。

### 测试 4：价格匹配

点击“匹配现有价格”，分别验证系统价格库、我的价格库、我的价格库优先加系统兜底，
以及找不到价格时显示“待询价”。

### 测试 5：成本计算

确认页面显示“已知成本小计”“已知人均成本”和待询价数量。仍有未解决项目时，不能
把小计显示成完整总成本。

### 测试 6：带入定价台

点击“带入研学定价台”，确认已匹配且数量确定的成本进入定价台。待询价项目不能以
0 元进入；它们应出现在待确认成本区域。

### 测试 7：学习

删除一个错误成本，再新增一个遗漏成本，点击“确认并学习”。打开 `/learning`，确认
出现个人学习记录和本次学习摘要。

### 测试 8：再次上传类似方案

导入另一份类似方案，完成 AI 分析和价格匹配，确认页面显示“历史学习建议”。历史建议
只能作为建议，不能绕过当前团型、项目、日期、人数、价格权限和价格有效期过滤，也不能
生成任何价格。

### 测试 9：活动归一与相似方案

在已有“割水稻”确认样本的账号中分析包含“水稻收割体验”的新方案。先检查确定性规则，
仅在规则无法判断时由用户点击“AI 查找候选”；模型只能返回候选，不得自动写入别名。
用户点击“确认归类”后，再确认页面把两者归一为同一标准活动，并展示相似方案、相似原因
和已确认历史成本经验。点击“不是同一活动”后，同一错误映射不得反复调用 AI 推荐。

### 测试 10：相似建议的价格安全

历史成本经验只能显示成本是否常见。用户点击“采用”后，当前方案必须重新通过当前
`price_items` 匹配；不得复制历史金额，不得把待询价项目按 0 元带入定价台。相似方案、
活动别名和确认成本必须严格按当前 `owner_id` 隔离。

## 7. 版本一致性检查

方案详情页顶部步骤为“导入方案 → AI 分析 → 匹配价格 → 人工确认 → 带入定价台”。
如果重新分析方案，旧成本快照会保留为历史，但页面必须提示：

```text
方案已重新分析，请重新匹配价格。
```

重新匹配后才可以确认并学习；旧分析对应的 costing 不能再次学习。重新匹配也会生成新
成本快照，旧快照不删除。
