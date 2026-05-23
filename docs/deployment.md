# FlowLedger 部署指南

部署目标：Vercel（应用） + Turso（libsql / SQLite 兼容数据库）。

本地开发不变，仍然用 `file:./data/flowledger.db`。

## 1. 准备 Turso

### 1.1 安装 CLI

```bash
brew install tursodatabase/tap/turso
turso auth signup           # 第一次用，浏览器登录
turso auth login            # 后续登录
```

### 1.2 创建数据库

```bash
turso db create flowledger              # 名字可以随便起
turso db show flowledger --url          # 拿到 libsql://flowledger-<your-org>.turso.io
turso db tokens create flowledger       # 拿到 auth token
```

把这两个值记下来，等会要填到 Vercel。

### 1.3 推送 schema + seed 到 Turso

本地 export 环境变量临时指向 Turso，跑一次 migration + seed：

```bash
export DATABASE_URL='libsql://flowledger-<your-org>.turso.io'
export DATABASE_AUTH_TOKEN='<上一步拿到的 token>'

npm run db:migrate          # 把 src/db/migrations/* 应用到 Turso
npm run db:seed             # seed 默认账户 / 分类 / 支付方式 / 快捷模板 / 汇率
```

跑完之后用 `turso db shell flowledger "select count(*) from accounts"` 之类的命令验证一下。

⚠️ 跑完 **unset 这两个变量**，免得后面本地 `npm run dev` 不小心连到 Turso：

```bash
unset DATABASE_URL DATABASE_AUTH_TOKEN
```

## 2. 准备 Vercel

### 2.1 连仓库

1. push 到 GitHub（如果还没）。
2. vercel.com → New Project → Import 这个 repo。
3. Framework Preset 选 Next.js，其他保持默认。

### 2.2 配置环境变量

Project Settings → Environment Variables，加三个（Production + Preview 都勾上）：

| Name | Value |
|------|-------|
| `DATABASE_URL` | `libsql://flowledger-<your-org>.turso.io` |
| `DATABASE_AUTH_TOKEN` | （turso db tokens create 输出） |
| `FLOWLEDGER_PASSWORD` | 你想用的访问密码（强密码） |

### 2.3 首次部署

Deploy。部署完了访问 vercel 给的域名，应该先看到登录页，输入 `FLOWLEDGER_PASSWORD` 设的密码 → 跳到首页。

## 3. 访问保护：内置密码门

FlowLedger 内置最小密码认证。只要 `FLOWLEDGER_PASSWORD` env var 有值，所有路径（除了 `/login`）都强制跳登录。

实现细节：
- session 是 JWT，存在 HttpOnly + Secure + SameSite=lax cookie 里，30 天 TTL
- JWT 的签名 secret **从 `FLOWLEDGER_PASSWORD` 派生**（SHA-256）
- 改密码 → 旧 secret 不匹配 → 所有现存 session 立即失效（不用手动登出）

### 怎么改密码

Vercel Settings → Environment Variables → 改 `FLOWLEDGER_PASSWORD` → Save → Redeploy。所有设备会跳回登录页。

### 不想用密码门？

不设 `FLOWLEDGER_PASSWORD` 这个 env var，middleware 看到没配就完全透传。结合 Vercel 默认那串长域名（`flowledger-xxxx-username.vercel.app`），别人猜不到就够个人用。属于 security by obscurity，单用户可以接受。

### 想要 OAuth / 多用户

把内置密码门拆掉换 [Auth.js](https://authjs.dev/) + Turso adapter。第一版没做是因为对单用户记账过度。要换的时候删 `middleware.ts`、`src/app/login`、`src/app/actions/auth.ts`、`src/lib/auth.ts`，按 Auth.js 文档重新接入。

## 4. 日常维护

### 4.1 改 schema 后部署

```bash
# 1. 本地改 src/db/schema.ts
# 2. 生成 migration
npm run db:generate

# 3. 推到 Turso
export DATABASE_URL='libsql://...'
export DATABASE_AUTH_TOKEN='...'
npm run db:migrate
unset DATABASE_URL DATABASE_AUTH_TOKEN

# 4. push 代码到 GitHub，Vercel 自动重新部署
git push
```

### 4.2 备份 Turso 数据

```bash
turso db shell flowledger ".dump" > backup-$(date +%Y%m%d).sql
```

定期备份到本地或同步到云盘。Turso 免费档已有自动备份但保留时间有限。

### 4.3 出问题时回滚

代码回滚：Vercel 项目 → Deployments → 找到上一个好版本 → Promote to Production。

数据库回滚：从备份 SQL 重建。或 `turso db shell flowledger` 手动改。

## 5. 已知限制

- **数据隐私**：Turso 内部加密 at rest，但服务商技术上能看到你的财务数据。
- **免费档容量**：Turso 免费 9GB / 10 亿行读，单用户多年用不完。Vercel 免费档 100GB 流量。
- **冷启**：Turso 短暂闲置后第一个请求略慢（几百毫秒）。Vercel serverless 同理。
