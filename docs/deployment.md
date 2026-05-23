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

Project Settings → Environment Variables，加两个（Production + Preview 都勾上）：

| Name | Value |
|------|-------|
| `DATABASE_URL` | `libsql://flowledger-<your-org>.turso.io` |
| `DATABASE_AUTH_TOKEN` | （turso db tokens create 输出） |

### 2.3 首次部署

Deploy。部署完了访问 vercel 给的域名，应该能看到首页 + seed 账户余额都是 0。

## 3. 访问保护

部署到 Vercel 之后域名是公开的——FlowLedger 没做登录系统，**默认任何人访问都能看到/编辑你的财务数据**。三种保护方案：

1. **Vercel Pro 的 Password Protection**（最简单）：Project Settings → Deployment Protection →
   开启密码保护。给整个项目设一个密码。需要 Pro 计划。
2. **不绑定自定义域名**：Vercel 默认域名长且不规则（`flowledger-xxx-zhang.vercel.app`），
   不主动分享别人猜不到。算"安全 by obscurity"，凑合够个人用。
3. **Cloudflare Access** 等外层认证：把项目放到 Cloudflare 后面，用 Cloudflare Access
   做基于邮箱的访问控制。免费但配置复杂。

我自己用 2 就够，敏感场景再考虑 1 / 3。

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
