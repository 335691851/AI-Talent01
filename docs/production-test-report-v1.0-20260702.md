# AI Talent 生产环境完整测试报告 v1.0

测试时间：2026-07-02 23:55（Asia/Shanghai）

测试对象：

- 生产应用：`https://ai-talent01.vercel.app`
- Vercel 项目：`daidai634/ai-talent01`
- Supabase 生产项目：`cvbsjqxmqlptmqgpbgsz`
- 当前生产部署：`dpl_4XHCYLGjbdmBq1PVism5FTWLddAZ`
- 当前生产代码提交：`5a30b67eaf59955ea33c8841266c711733bf013f`
- 说明：当前本地工作区存在未提交的飞书免登开发改动，本次测试不包含该未发布代码。

## 一、总体结论

生产环境主体可用，员工档案导入、档案完整性、embedding 覆盖、pgvector RPC、评估接口调用、部署运行状态均通过检查。

本次测试发现 1 个需要上线前处理的数据治理问题：工号 `600001` 关联了 3 个 active 员工登录账号，导致 `app_users` 中员工账号数为 109，而员工主档案为 107。建议清理误建账号并补充数据库唯一约束或业务防重策略。

本机对 `https://ai-talent01.vercel.app/login` 的直接 HTTP smoke test 超时，无法在当前网络下完成真实浏览器端到端测试；Vercel 运行日志显示生产页面和接口有正常访问记录，且近 24 小时无 runtime error。

## 二、测试范围

| 模块 | 结论 | 说明 |
|---|---:|---|
| Vercel 部署状态 | 通过 | 最新生产部署 READY |
| Vercel 运行日志 | 通过 | 近 24 小时无 runtime errors |
| 页面访问日志 | 通过 | `/employees`、`/assessment`、`/search`、`/imports` 等页面均有 200 访问 |
| 本机 HTTP smoke test | 受限 | 当前网络访问 `vercel.app:443` 超时 |
| Supabase 项目健康 | 通过 | `ACTIVE_HEALTHY` |
| 数据库 migration | 通过 | 4 个 migration 已应用 |
| Excel 导入结果 | 通过 | 107 行成功，0 行失败 |
| 员工档案数据 | 通过 | 107 员工、107 档案、完成度 100% |
| 员工账号数据 | 有问题 | 109 个 employee 账号，存在重复账号 |
| Embedding / pgvector | 通过 | 107 人覆盖，651 chunks，1024 维 |
| RAG RPC | 通过 | `match_employee_embeddings` 返回 5 条，最高相似度 1 |
| AI 自评估接口 | 部分通过 | 接口 2 次调用均 200；已有 1 个进行中会话，尚无结果 |
| RLS / 安全 | 通过但有提示 | RLS 开启；advisor 有预期 INFO/WARN |

## 三、Vercel 生产部署检查

| 项目 | 结果 |
|---|---|
| Project ID | `prj_ytLwqrDBCwXN4tw48JweEu1p7O1k` |
| Team ID | `team_NPNyYFrXqOkfFgVAvutcxCiK` |
| Framework | Next.js |
| Node Version | 24.x |
| Deployment ID | `dpl_4XHCYLGjbdmBq1PVism5FTWLddAZ` |
| Deployment State | READY |
| Target | production |
| Region | iad1 |
| Production Alias | `ai-talent01.vercel.app` |
| Git Branch | master |
| Git Commit | `5a30b67 Harden embedding search function migration` |

近 24 小时运行状态码统计：

| 状态码 | 次数 | 说明 |
|---:|---:|---|
| 200 | 270 | 正常响应 |
| 303 | 6 | 正常重定向 |
| 307 | 7 | 正常重定向 |
| 404 | 22 | 均为 favicon 缺失 |

近 24 小时主要访问路径：

| 路径 | 次数 |
|---|---:|
| `/employees` | 56 |
| `/` | 54 |
| `/assessment` | 48 |
| `/search` | 36 |
| `/imports` | 34 |
| `/settings` | 32 |
| `/login` | 14 |
| `/api/assessment/chat` | 2 |
| `/api/import/employees` | 1 |

异常检查：

- Runtime errors：未发现。
- Toolbar unresolved comments：0。
- Vercel Agent Runs：0。
- Build logs：Vercel MCP 返回 401，当前账号无法读取构建日志 endpoint。
- 4xx 明细：仅 `/favicon.ico` 与 `/favicon.png` 缺失，不影响业务。

## 四、Supabase 生产数据库检查

Supabase 项目状态：

| 项目 | 结果 |
|---|---|
| Project Ref | `cvbsjqxmqlptmqgpbgsz` |
| Name | AI Talent production |
| Region | us-east-2 |
| Status | ACTIVE_HEALTHY |
| Postgres | 17.6 |

已应用 migration：

| Version | Name |
|---|---|
| `20260702143753` | `initial_schema` |
| `20260702143809` | `security_rls` |
| `20260702143827` | `search_chunk_evidence` |
| `20260702144245` | `fix_match_employee_embeddings_search_path` |

核心表数量：

| 表 | 数量 |
|---|---:|
| `employees` | 107 |
| `employee_ai_profiles` | 107 |
| `employee_embeddings` | 651 |
| `app_users` | 110 |
| `import_batches` | 1 |
| `import_rows` | 107 |
| `assessment_sessions` | 1 |
| `assessment_messages` | 5 |
| `assessment_results` | 0 |

账号角色：

| 角色 | 状态 | 数量 |
|---|---|---:|
| admin | active | 1 |
| employee | active | 109 |

## 五、导入与档案完整性

Excel 导入批次：

| 文件 | 状态 | 总行数 | 成功 | 失败 |
|---|---|---:|---:|---:|
| `员工AI档案_员工信息表.xlsx` | completed | 107 | 107 | 0 |

档案完整性：

| 检查项 | 结果 |
|---|---:|
| 员工主档案 | 107 |
| AI 档案 | 107 |
| AI 档案覆盖员工 | 107 |
| 产品能力非空 | 107 |
| 技术能力非空 | 107 |
| 项目经验非空 | 107 |
| 档案完成度最小值 | 100 |
| 档案完成度最大值 | 100 |
| 档案完成度平均值 | 100 |
| 工号重复组 | 0 |
| 手机号重复组 | 0 |

发现问题：

- `app_users` 员工账号为 109 个，但员工主档案为 107 个。
- 重复账号集中在工号 `600001`，该员工关联了 3 个 active 登录账号。
- 影响：员工档案和 embedding 不受影响，但登录身份存在不一致风险。
- 建议：清理多余账号，只保留正式手机号账号；后续在创建账号逻辑上增加同一 `employee_id` 的唯一约束或业务防重。

## 六、Embedding 与 RAG 检查

Embedding 覆盖：

| 检查项 | 结果 |
|---|---:|
| 覆盖员工 | 107 |
| chunk 总数 | 651 |
| 向量维度 | 1024 |
| 过期 embedding 员工 | 0 |
| 过期 embedding chunk | 0 |
| 最大 chunk 长度 | 900 |
| 平均 chunk 长度 | 329.4 |

chunk 类型分布：

| chunk_type | chunks | 覆盖员工 |
|---|---:|---:|
| `product_ability` | 107 | 107 |
| `technical_ability` | 107 | 107 |
| `project_experience` | 276 | 107 |
| `profile` | 161 | 107 |

pgvector / RPC 检查：

| 项目 | 结果 |
|---|---|
| `vector` 扩展 | 0.8.2 |
| `pgcrypto` 扩展 | 1.3 |
| RPC 函数 | `match_employee_embeddings` |
| `SECURITY DEFINER` | false |
| `search_path` | public |
| RPC smoke test | 返回 5 条 |
| 最高相似度 | 1 |
| 最低相似度 | 0.8953 |

结论：向量库和 pgvector 检索链路可用。

## 七、AI 自评估检查

生产数据：

| 项目 | 结果 |
|---|---:|
| 进行中 session | 1 |
| assessment messages | 5 |
| assessment results | 0 |
| latest results | 0 |

Vercel 日志：

- `/api/assessment/chat` 在近 24 小时有 2 次 POST 调用。
- 两次调用状态均为 200。

结论：

- AI 自评估接口可用。
- 当前会话尚未完成 10 轮，因此无最终评估结果，符合业务规则。
- 未读取或输出完整对话内容，符合管理员不查看完整 chat 数据的权限原则。

## 八、安全与权限检查

RLS 状态：

| 表 | RLS |
|---|---|
| `app_users` | enabled |
| `employees` | enabled |
| `employee_ai_profiles` | enabled |
| `employee_embeddings` | enabled |
| `assessment_sessions` | enabled |
| `assessment_messages` | enabled |
| `assessment_results` | enabled |
| `import_batches` | enabled |
| `import_rows` | enabled |

Supabase security advisor：

| 提示 | 等级 | 结论 |
|---|---|---|
| RLS Enabled No Policy | INFO | 当前服务端 service role 访问模型下可接受，后续建议显式 deny policy |
| Extension in Public: vector | WARN | MVP 阶段可接受，稳定后迁移到 extensions schema |

Performance advisor：

- Supabase MCP advisor 执行失败，返回 SQL 语法错误，未能取得性能 advisor 结果。
- 该失败来自 Supabase advisor 工具调用，不代表业务数据库异常。

## 九、受限项

| 项目 | 结果 | 原因 |
|---|---|---|
| 本机访问生产 URL | 未通过 | `curl` 访问 `https://ai-talent01.vercel.app/login` 20 秒超时 |
| Playwright 生产端到端 | 未执行 | 当前机器无法直连生产域名 |
| Vercel build logs | 未读取 | Vercel MCP build log endpoint 返回 401 |

替代验证：

- 使用 Vercel 生产运行日志确认页面和接口被正常访问。
- 使用 Supabase 生产 SQL 只读检查确认数据和核心函数状态。
- 使用 Vercel runtime error 聚合确认近 24 小时无 runtime errors。

## 十、结论与建议

发布状态判断：当前生产版本可继续业务验证，但建议先处理一个数据治理问题后再扩大使用范围。

必须处理：

1. 清理工号 `600001` 的重复 active 员工账号，只保留正式账号。
2. 补充账号创建防重：同一员工不应生成多个 employee 登录账号。

建议处理：

1. 补充 favicon，消除无意义 404。
2. 为 RLS 增加显式 deny policy，降低 advisor 噪音并增强安全意图表达。
3. 稳定后迁移 `vector` extension 到非 public schema。
4. 完成一次真实员工 10 轮 AI 自评估，验证最终评估结果落库。
5. 在网络可访问环境下执行一次 Playwright 生产端到端测试。

