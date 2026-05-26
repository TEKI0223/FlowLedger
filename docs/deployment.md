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
npm run db:seed             # seed 默认交易分类
```

跑完之后用 `turso db shell flowledger "select count(*) from categories"` 之类的命令验证一下。

`npm run db:seed:dev`
只用于本地开发测试数据，会写入示例账户、支付方式、快捷模板、信用卡和汇率。这个命令默认拒绝写入远程数据库，不要对正式库执行。

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

| Name                    | Value                                     |
| ----------------------- | ----------------------------------------- |
| `DATABASE_URL`          | `libsql://flowledger-<your-org>.turso.io` |
| `DATABASE_AUTH_TOKEN`   | （turso db tokens create 输出）           |
| `FLOWLEDGER_USERS_JSON` | 两个登录用户的 JSON 配置                  |

`FLOWLEDGER_USERS_JSON` 示例：

```json
[
  { "id": "zhang", "name": "zhang", "password": "生产强密码 1" },
  { "id": "liu", "name": "liu", "password": "生产强密码 2" }
]
```

### 2.3 首次部署

Deploy。部署完了访问 vercel 给的域名，应该先看到登录页，选择用户并输入对应密码 → 跳到首页。

## 3. 访问保护：内置双人密码门

FlowLedger **强制启用登录保护**——`FLOWLEDGER_USERS_JSON` 是必需环境变量。所有路径（除
`/login`）都强制登录。登录后 session 会携带当前用户 id，账户、支付方式、信用卡、交易、模板、周期项、退款和分期都会按当前用户隔离；分类和汇率是全局共享。

本地开发也一样，把它写进 `.env.local`：

```bash
echo 'FLOWLEDGER_USERS_JSON=[{"id":"zhang","name":"zhang","password":"devpassword"},{"id":"liu","name":"liu","password":"devpassword2"}]' >> .env.local
```

实现细节：

- session 是 JWT，存在 HttpOnly + Secure + SameSite=lax cookie 里，30 天 TTL
- JWT 的 `sub` 是当前用户 id
- JWT 的签名 secret **从 `FLOWLEDGER_USERS_JSON` 派生**（SHA-256）
- 改任一用户配置或密码 → 旧 secret 不匹配 → 所有现存 session 立即失效（不用手动登出）

### 怎么改用户或密码

- 本地：改 `.env.local`，重启 `npm run dev`
- 生产：Vercel Settings → Environment Variables → 改 `FLOWLEDGER_USERS_JSON` → Save → Redeploy

两种情况都会让所有设备跳回登录页。

### 想要 OAuth / 更完整账号系统

把内置密码门换 [Auth.js](https://authjs.dev/) + Turso
adapter。当前内置方案适合两人自用；要换的时候删
`src/proxy.ts`、`src/app/login`、`src/app/actions/auth.ts`、`src/lib/auth.ts`，按 Auth.js 文档重新接入。

## 4. 日常维护

### 4.0 浏览 / 编辑数据：Drizzle Studio

最方便的可视化编辑器：

```bash
# 本地数据库
npm run db:studio
```

会启一个本地 web 界面（默认 https://local.drizzle.studio），可以看所有表、改字段、加
/ 删行、跑自定义 SQL。

要编辑 **Turso 上的远程数据**，给 db:studio 临时加上 env：

```bash
DATABASE_URL='libsql://...' DATABASE_AUTH_TOKEN='...' npm run db:studio
```

⚠️ 直接编辑生产库要小心——余额是从交易流水推算的，绕过 action 直接改 `accounts.balance_minor`
会和交易历史脱节。建议只用 Studio 改"非余额型"字段（备注、分类、汇率、停用 / 启用周期项等）；要调余额还是走应用的「余额校准」入口产生 adjustment 交易。

简短 SQL 改动：

```bash
turso db shell flowledger
> UPDATE exchange_rates SET rate = 22.0 WHERE id = 'cny-to-jpy';
> .exit
```

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
