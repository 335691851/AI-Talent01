# AI Talent 配置与部署

本文覆盖本地开发、Supabase 初始化、Embedding 全量构建、Vercel 部署、飞书配置和常见故障排查。生产环境不应复用仓库示例中的密码或密钥。

## 1. 环境组成

完整运行环境由以下部分组成：

| 组件 | 用途 | 是否必需 |
| --- | --- | :---: |
| Node.js 24.x + npm | 本地开发、构建和脚本 | 是 |
| Supabase 项目 | Postgres、pgvector、业务数据 | 真实业务必需 |
| DeepSeek API | 10 轮 AI 自评和最终评分 | 完整评估必需 |
| Cloudflare Workers AI | BGE-M3 Embedding | 语义人才检索必需 |
| Vercel | 生产部署和观测 | 生产环境推荐 |
| 飞书企业自建应用 | 工作台自动免登 | 可选 |

未配置 DeepSeek 时，本地可以使用演示响应跑通评估流程。未配置 Cloudflare 时，档案仍可保存，人才检索降级为结构化匹配。

## 2. 获取代码与安装依赖

```powershell
git clone <REPOSITORY_URL>
Set-Location AI-Talent01
npm install
Copy-Item .env.example .env.local
```

`.env.local` 已被 `.gitignore` 忽略，用于保存本地密钥。不要把任何实际密钥写入 `.env.example`、README、截图或客户端代码。

## 3. 环境变量

### 3.1 应用与 Session

| 变量 | 必需 | 示例/默认 | 说明 |
| --- | :---: | --- | --- |
| `APP_URL` | 是 | `http://localhost:3000` | 应用基础地址；生产环境填写正式 HTTPS Origin |
| `NEXT_PUBLIC_APP_NAME` | 否 | `AI Talent` | 浏览器可见的应用名称；`NEXT_PUBLIC_` 变量会进入客户端包 |
| `AUTH_SECRET` | 是 | 无 | HS256 Session 签名密钥，至少 32 字节随机值 |

生成 `AUTH_SECRET`：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### 3.2 Supabase 与 Postgres

| 变量 | 必需 | 获取位置 | 说明 |
| --- | :---: | --- | --- |
| `DATABASE_URL` | 是 | Supabase 项目连接信息 | migration 和 backfill 使用的 Postgres 连接串 |
| `SUPABASE_URL` | 是 | Project Settings / API | 项目 API URL |
| `SUPABASE_ANON_KEY` | 是 | Project Settings / API | 配置完整性检查使用；当前业务不在浏览器直接查询表 |
| `SUPABASE_SERVICE_ROLE_KEY` | 是 | Project Settings / API | 仅服务端使用，可绕过 RLS，绝不能暴露给浏览器 |

建议 `DATABASE_URL` 使用 Supabase 提供的可连接 Postgres URL。若本地网络不支持直接连接，可按 Supabase 当前建议选择 session pooler，并确认脚本支持的连接模式。

### 3.3 DeepSeek

| 变量 | 必需 | 默认 | 说明 |
| --- | :---: | --- | --- |
| `DEEPSEEK_API_KEY` | 完整评估必需 | 无 | DeepSeek API Key，仅服务端读取 |
| `DEEPSEEK_BASE_URL` | 否 | `https://api.deepseek.com` | OpenAI-compatible API Base URL |
| `DEEPSEEK_MODEL` | 否 | `deepseek-v4-flash` | AI 自评使用的模型标识 |

模型名称必须是当前 DeepSeek 账号实际可调用的模型。如果服务返回“模型不存在”，以供应商控制台和官方 API 文档中的标识为准更新该变量。

### 3.4 Cloudflare Workers AI

| 变量 | 必需 | 默认 | 说明 |
| --- | :---: | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | 语义检索必需 | 无 | Cloudflare Account ID |
| `CLOUDFLARE_API_TOKEN` | 语义检索必需 | 无 | 具有 Workers AI 调用权限的 API Token |
| `CLOUDFLARE_EMBEDDING_MODEL` | 否 | `@cf/baai/bge-m3` | 文档和 query 共用的 Embedding 模型 |
| `CLOUDFLARE_EMBEDDING_DIMENSIONS` | 否 | `1024` | 必须与模型输出和数据库 `vector(1024)` 一致 |

### 3.5 初始账号策略

| 变量 | 必需 | 说明 |
| --- | :---: | --- |
| `ADMIN_USERNAME` | 是 | 未配置数据库时的本地管理员账号；生产环境也应设置为预期值 |
| `ADMIN_INITIAL_PASSWORD` | 是 | 未配置数据库时的本地管理员密码，禁止生产沿用弱密码 |
| `DEFAULT_EMPLOYEE_PASSWORD` | 是 | Excel 导入或新建员工账号时用于生成 bcrypt 哈希的初始密码 |

数据库 migration 会保证管理员记录存在，但数据库内账号密码与环境变量并非自动持续同步。生产初始化后应确认数据库中的管理员密码哈希符合当前密码策略。

### 3.6 AI 与检索参数

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `AI_ASSESSMENT_TOTAL_ROUNDS` | `10` | 新评估会话总轮数 |
| `AI_STREAM_MAX_DURATION` | `60` | 页面配置展示的 AI 流最大时长；Route Handler 当前导出 `maxDuration = 60` |
| `AI_FORCE_DEMO_RESPONSES` | `false` | `true` 时强制使用演示 AI 和确定性演示向量，仅用于本地/E2E |
| `RAG_TOP_K` | `8` | 预留的检索配置值；当前 pgvector RPC 调用固定 `match_count=20` |
| `RAG_MIN_SCORE` | `0.35` | 语义阈值输入；运行时基础阈值不会低于 `0.45` |

### 3.7 飞书免登

| 变量 | 必需 | 默认/说明 |
| --- | :---: | --- |
| `FEISHU_APP_ID` | 启用飞书时必需 | 企业自建应用 App ID |
| `FEISHU_APP_SECRET` | 启用飞书时必需 | App Secret，仅服务端读取 |
| `FEISHU_APP_HOME_URL` | 启用飞书时必需 | 应用 HTTPS Origin，不包含路径 |
| `FEISHU_API_BASE_URL` | 否 | `https://open.feishu.cn` |
| `FEISHU_AUTHORIZE_URL` | 否 | 当前代码默认使用飞书授权入口 |
| `FEISHU_REDIRECT_PATH` | 否 | `/api/auth/feishu/callback` |

## 4. 初始化 Supabase

### 4.1 执行 migration

确保 `.env.local` 已配置 `DATABASE_URL`：

```powershell
npm.cmd run db:push
```

脚本 `scripts/setup-db.mjs` 会按名称排序执行 `supabase/migrations/*.sql`，当前包括：

1. 创建 `vector`、`pgcrypto`、枚举、业务表、索引和初始 RPC。
2. 为全部业务表启用 RLS，并撤销 `anon`、`authenticated` 直接表权限。
3. 更新向量检索 evidence 返回结构。
4. 固定 RPC `search_path` 并将执行权限限制到 `service_role`。

完成后可在 Supabase SQL Editor 检查：

```sql
select extname, extversion
from pg_extension
where extname in ('vector', 'pgcrypto');

select relname, relrowsecurity
from pg_class
where relname in (
  'employees', 'app_users', 'employee_ai_profiles',
  'assessment_sessions', 'assessment_messages', 'assessment_results',
  'employee_embeddings', 'import_batches', 'import_rows'
);
```

### 4.2 验证 RPC

```sql
select
  p.proname,
  p.proconfig
from pg_proc p
where p.proname = 'match_employee_embeddings';
```

应用只通过服务端 service role 调用该 RPC。不要为 `anon` 或 `authenticated` 重新授予执行权限。

## 5. 本地运行

```powershell
npm.cmd run dev
```

默认地址为 `http://localhost:3000`。首次检查建议按以下顺序：

1. 打开 `/login`，确认页面可加载。
2. 管理员登录后打开 `/settings`，确认 Supabase、DeepSeek 和 Cloudflare 状态。
3. 使用 `/imports` 下载模板并导入专用测试员工。
4. 使用员工账号登录，完成档案编辑和 AI 自评。
5. 管理员在 `/search` 验证结构化与语义检索结果。

### 5.1 演示 AI 模式

为了让 E2E 测试稳定复现，可在本地设置：

```dotenv
AI_FORCE_DEMO_RESPONSES=true
```

该模式使用确定性问题、结果和 1024 维演示向量。生产环境必须保持 `false`。

## 6. 全量重建 Embedding

当以下情况发生时建议执行 backfill：

- 首次批量导入后需要补齐历史员工向量。
- 修改 chunk 拆分规则。
- 更换 Embedding 模型但维度不变。
- 发现向量表覆盖率不足或内容过期。

运行：

```powershell
npm.cmd run embeddings:backfill
```

脚本行为：

1. 读取全部员工、AI 档案和最新有效评估。
2. 按岗位、能力、项目和最新评估生成 chunk。
3. 每批 8 个 chunk 调用 Cloudflare，429/5xx 最多重试 5 次并使用递增等待。
4. 验证向量数量和维度。
5. 所有向量生成成功后，在一个 Postgres 事务中清空并重写 `employee_embeddings`。
6. 输出员工覆盖数、chunk 总数、类型分布和耗时。

> 全量脚本会重写整张向量表。运行前确认连接的是目标环境，并避免与大量档案编辑并发执行。

## 7. 测试与构建

```powershell
# ESLint
npm.cmd run lint

# Vitest 单元测试
npm.cmd test

# Playwright 端到端测试
npm.cmd run test:e2e

# 生产构建
npm.cmd run build
```

针对 `master` 的 Pull Request 会由 `.github/workflows/ci.yml` 在 Node.js 24 上执行 `npm ci`、ESLint 和 Vitest。

## 8. Vercel 部署

### 8.1 导入仓库

1. 在 Vercel 创建项目并连接 GitHub 仓库。
2. Framework Preset 使用 Next.js。
3. Build Command 使用默认 `npm run build`。
4. Node.js 版本与 CI 保持一致。

### 8.2 配置 Environment Variables

在 Vercel Project Settings / Environment Variables 中录入 `.env.example` 对应变量。至少区分：

- Production：生产数据库和生产外部服务密钥。
- Preview：建议使用测试数据库或不创建涉及真实员工数据的 Preview。
- Development：供 `vercel env pull` 或 `vercel dev` 使用。

如果当前只有一套数据库，不建议把生产 service role 自动分配给所有不受控 Preview 分支。至少限制 Preview 的创建人员和仓库写权限。

密钥类变量包括：

- `AUTH_SECRET`
- `DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPSEEK_API_KEY`
- `CLOUDFLARE_API_TOKEN`
- `FEISHU_APP_SECRET`

这些变量都不能使用 `NEXT_PUBLIC_` 前缀。

### 8.3 部署顺序

推荐顺序：

1. 创建或确认 Supabase 生产项目。
2. 在受控终端使用生产 `DATABASE_URL` 执行 migration。
3. 配置 Vercel Production 环境变量。
4. 部署 `master`。
5. 导入员工数据。
6. 执行或在设置页触发向量补齐。
7. 使用专用测试员工完成一次端到端 smoke test。
8. 检查 Vercel Runtime Logs、Web Analytics 和 Supabase 数据。

环境变量修改后必须重新部署，现有 Deployment 不会自动重新读取新值。

## 9. 飞书工作台配置

### 9.1 权限

企业自建应用需要开通：

- `获取用户手机号`
- Scope：`contact:user.phone:readonly`

开通后创建并发布应用版本。OAuth 授权 URL 已在代码中显式请求该 scope。

### 9.2 地址

设应用 Origin 为：

```text
https://<APP_DOMAIN>
```

飞书工作台应用主页：

```text
https://<APP_DOMAIN>/
```

OAuth 回调地址：

```text
https://<APP_DOMAIN>/api/auth/feishu/callback
```

对应环境变量：

```dotenv
FEISHU_APP_HOME_URL=https://<APP_DOMAIN>
FEISHU_REDIRECT_PATH=/api/auth/feishu/callback
```

系统在飞书/Lark User-Agent 中自动发起 OAuth，不显示手动免登按钮。回调使用飞书返回的手机号匹配 `app_users.phone`，因此员工档案手机号必须与飞书通讯录一致。

## 10. 常见故障

### `DATABASE_URL is required`

- 确认命令从仓库根目录运行。
- 确认 `.env.local` 存在且变量名正确。
- `db:push` 已使用 `node --env-file=.env.local`，无需手工加载 dotenv。

### 数据库已连接但页面无数据

- 检查 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 是否属于同一项目。
- 检查 migration 是否全部执行。
- 检查员工数据是否已导入。

### Cloudflare Embedding 失败

- 检查 Account ID、Token 权限和模型标识。
- 检查返回向量是否为 1024 维。
- 429/5xx 时使用全量 backfill 的重试机制；档案增量向量化当前不自动重试。

### 人才检索只有结构化结果

- 打开 `/settings` 检查 Embedding 状态。
- 检查 `employee_embeddings` 是否有数据。
- 检查 Trace 中 `semantic.skipped` 或 `semantic.failed` 的原因。

### DeepSeek 调用失败

- 检查 API Key、Base URL 和模型标识。
- 检查 Vercel Function 是否在 60 秒内完成。
- 本地可暂时启用演示模式定位 UI 与数据库链路。

### 飞书回调提示未返回手机号

- 开通并发布 `contact:user.phone:readonly`。
- 确认授权请求包含该 scope。
- 确认飞书成员通讯录中有手机号。

### 飞书提示账号不存在

- 对比飞书手机号和 `app_users.phone`。
- 中国大陆号码会去除 `+86` 或前缀 `86` 后匹配。
- 确认账号状态为 `active`。

### Next.js `ChunkLoadError`

- 停止开发服务器。
- 删除 `.next` 后重新运行 `npm.cmd run dev`。
- 浏览器执行清空缓存并硬性重新加载。

## 11. 发布前清单

- [ ] 所有生产密钥已存入 Vercel，不存在于 Git 历史和客户端包。
- [ ] `AUTH_SECRET` 使用随机值且与其他环境隔离。
- [ ] migration 与 RLS 检查通过。
- [ ] 管理员和员工初始密码已按企业策略设置。
- [ ] Cloudflare 向量维度与数据库一致。
- [ ] 全量向量覆盖率符合预期。
- [ ] 飞书权限、主页和回调地址已发布生效。
- [ ] `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run build` 通过。
- [ ] 使用专用测试员工完成导入、档案、10 轮评估和人才检索 smoke test。

## 12. 相关文档

- [返回 README](../README.md)
- [系统架构](architecture.md)
- [安全与认证](security-and-auth.md)
- [测试方案](testing-plan.md)
