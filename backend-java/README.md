# 知序 Java 后端 · 本地与 Render 免费部署

部署说明请阅读 `deploy/Render部署步骤.md`。线上启用 `production` 配置，数据保存在现有 Supabase 的私有 `zhixu_backend` schema；默认本地模式仍使用 H2。

生产模式禁止自动回退 H2；缺少数据库参数或数据表时启动失败。额度预留在事务中完成，PostgreSQL advisory lock 负责跨实例互斥。Docker 构建使用 Java 21。

验证：9 项 Java 回归测试通过；PGlite PostgreSQL 引擎验证建表、重复执行和匿名/普通用户权限隔离通过。未使用你的真实数据库密码测试 JDBC，也未完成 Render 部署；本机 Docker 引擎未运行，因此容器构建需要由 Render 验证。

## 开发与测试

Java 21+、Maven：`mvn test`；本地运行 `mvn spring-boot:run` 使用 H2。生产 Docker 内固定启用 production 配置；直接运行 JAR 时也可用 SPRING_PROFILES_ACTIVE=production。

模型仍使用兼容 Chat Completions 的服务端接口。所有登录通过 Supabase 验证；云端资料读取使用用户令牌和 RLS。生成结果和调用记录持久化，用于额度、失败记录与请求去重。数据库不保存登录令牌或模型密钥。

## 使用边界

每次讲解只发送选中段落和本次问题，暂不携带历史对话。额度按北京时间自然日计算；进入模型调用后的失败计入额度。免费云服务可能休眠，模型调用仍按服务商账单收费。

答案可能包含私人笔记内容，请保护数据库凭证。暂未实现自动清理历史答案。扩展到较大用户量之前，应补充监控、保留期限和压力测试。


## 学习地图（2026-11-14）

新增账号隔离的学习对话树。先在 Supabase SQL Editor 执行 `deploy/supabase-conversations.sql`，再部署后端；生产启动会检查新表是否存在。

- `GET /api/v1/ai/conversations`：当前账号最近的对话（账号上限 200 个）。
- `POST /api/v1/ai/conversations/open`：用 `id`、`excerpt` 和 `sourcePath` / `documentId` 创建学习起点；不调用模型。
- `POST /api/v1/ai/conversations/read`：传 `id`，读取私有对话和布局。
- `POST /api/v1/ai/conversations/send`：传 `id`、`requestId`、`parentId`（首次为 null）、`question`、`mode`。
- `POST /api/v1/ai/conversations/layout`：传 `id`、`revision`、`positions:[{id,x,y}]`，通过版本号避免覆盖其他页面的布局。

所有接口沿用 Supabase Bearer 身份验证；数据保存在私有 `zhixu_backend` schema。前端不能直接读表。模型只接收原文和当前父节点链中最近 4 轮（每个历史回答最多 4500 字，总上文约 20000 字）。每张地图最多 100 轮，失败记录也保留。

`requestId` 用于去重：重复提交成功请求会恢复已有回答，不再调用模型。失败调用继续计入原有每日限额。请求途中中断时先读取对话，再重试相同请求编号；已标记失败的轮次需要新的请求编号。原始笔记权限在每次发送前重新校验。

本功能借鉴 dsh-synapse 的会话地图理念，代码为知序现有 Java / Supabase 架构独立实现，不依赖 DeepSeek Harness。参考：https://github.com/liangmianya/dsh-synapse
