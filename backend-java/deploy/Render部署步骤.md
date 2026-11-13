# Render 免费部署：按顺序做

## 1. 上传新后端

解压部署包，将 `backend-java` 文件夹整体拖到 GitHub 仓库根目录上传。不要点进文件夹后把文件平铺上传。

上传完成后，仓库中必须能点开 `backend-java/Dockerfile`、`backend-java/pom.xml` 和 `backend-java/src/`。旧根目录的 Java 文件暂时不用删，Render 只会构建新文件夹。

## 2. 在现有 Supabase 项目建额度表

打开 Supabase → SQL Editor → New query。将本包 `backend-java/deploy/supabase-ai.sql` 的全部内容粘贴进去，点击 Run。成功后应显示 Success。

它只创建私有的 `zhixu_backend` schema 和 AI 额度表，不修改用户账号、刷题记录或笔记表。不要把此 schema 加到 Data API 的 exposed schemas。可重复执行。

## 3. 找数据库连接参数

Supabase 顶部 Connect → 连接方式选择 **Session pooler**（会话连接池），使用控制台显示的 Host、Port、Database、User。Session pooler 通常使用 5432，能在 IPv4 环境连接。不要选 direct connection 的 db.xxx.supabase.co 地址，也不要选 transaction pooler 的 6543。

数据库密码是创建 Supabase 项目时设置的 Database password，不是邮箱密码、publishable key 或 DeepSeek 密钥。忘记密码可在 Supabase 数据库设置里重设（先确认没有其他依赖旧密码的服务）。密码只填 Render 环境变量，不要发聊天或上传 GitHub。

## 4. 填 Render 页面

| 字段 | 值 |
|---|---|
| Name | zhixu-backend |
| Language | Docker |
| Branch | main |
| Region | Singapore（若可选） |
| Root Directory | backend-java |
| Dockerfile Path | ./Dockerfile（相对于 Root Directory） |
| Docker Build Context | .（如果界面有此项） |
| Docker Command | 留空 |
| Instance Type | Free / $0 |
| Advanced → Health Check Path | /api/v1/health |

不用填写 Maven Build Command，Dockerfile 会编译。不要选择付费磁盘，也不要新建 Render Postgres。

在 Environment Variables 中逐项添加：

| KEY | VALUE |
|---|---|
| SPRING_PROFILES_ACTIVE | production |
| DB_URL | jdbc:postgresql://你的Session-pooler-Host:5432/postgres?sslmode=require |
| DB_USERNAME | Connect 中显示的 User，通常是 postgres.项目编号 |
| DB_PASSWORD | 你的 Supabase 数据库密码 |
| AI_BASE_URL | https://api.deepseek.com |
| AI_MODEL | deepseek-flash |
| AI_API_KEY | 你的 DeepSeek API 密钥 |
| ALLOWED_ORIGINS | https://alt-s25.github.io |
| AI_DAILY_LIMIT | 10 |
| AI_GLOBAL_LIMIT | 100 |

DB_URL 中不放用户名、密码；Host 必须复制控制台的完整地址，不能填写示例文字。若控制台端口/数据库名与表格不同，以实际值为准。已有的 Supabase 项目 URL、公钥由代码配置，若换项目需覆盖 SUPABASE_URL 和 SUPABASE_PUBLISHABLE_KEY。

这两个额度值仅限制次数，不是费用上限。模型密钥是服务端秘密，不能写 ai-config.js。Render 上不用配置电脑的代理参数。

所有字段完成后才点击 Deploy web service。

## 5. 等待部署并连接网页

Render 状态变为 Live 后，复制给你的 HTTPS 网址（例如 https://你的服务名.onrender.com）。访问它的 `/api/v1/health`，应该显示 status=ok、aiConfigured=true。

然后编辑 GitHub 根目录 `ai-config.js`：

```javascript
window.ZHIXU_AI = Object.freeze({ apiBaseUrl: 'https://你的真实Render服务地址' });
```

不要使用示例域名或 localhost。提交并等 GitHub Pages 部署完成，强制刷新网站，在笔记里登录并实际生成一次讲解。

## 免费版限制与验证边界

Render 免费服务闲置后会休眠，首次唤醒可能约一分钟。遇到首次请求超时，可先打开后端 health 页面，待响应后回网页重试。数据库与额度存于 Supabase，不随 Render 休眠/重部署清零。Supabase 免费项目也受自身配额、暂停等限制；免费托管不等于永久可用保证。

本地 H2 测试历史不会自动导入云端；上线从新额度表开始。账号和笔记仍使用原 Supabase 项目。

已有 9 项 Java 回归测试通过，数据库建表与权限脚本通过 PGlite 验证；尚未完成真实 Supabase JDBC 连接和 Render 容器构建。这两项需在用户填写配置后检查部署日志与实际登录请求。

官方参考：
- https://render.com/docs/docker
- https://render.com/docs/free
- https://supabase.com/docs/guides/database/connecting-to-postgres
