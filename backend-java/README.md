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
