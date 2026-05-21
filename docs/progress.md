# FlowLedger 开发进度记录

最后更新：2026-05-21

## 当前阶段

当前 M2 第一轮已完成。首页已读取真实快捷模板，点击快捷卡片会直接打开快捷记账 modal，从模板预填账户、分类、支付方式和币种，只让用户输入金额、日期和备注；临时记录入口也已建立。下一步需要进行手动保存验收，再继续打磨手机端录入效率。

## 里程碑状态

| 里程碑                    | 状态   | 说明                                                            |
| ------------------------- | ------ | --------------------------------------------------------------- |
| M0 项目基线和开发护栏     | 已完成 | 数据库、迁移、seed、金额模型和验证命令已建立                    |
| M1 账户与基础交易闭环     | 已完成 | 账户创建/编辑、交易创建/编辑/删除、余额回滚和错误提示已通过验收 |
| M2 首页概览和快捷录入     | 进行中 | 首页快捷模板和轻量记账页已完成，待手动保存验收                  |
| M3 周期项目和待确认流程   | 未开始 | 依赖基础交易闭环                                                |
| M4 信用卡账单周期         | 未开始 | 依赖交易和账户规则                                              |
| M5 余额型账户、现金和校准 | 未开始 | 依赖账户详情和调整交易                                          |
| M6 退款和分期             | 未开始 | 依赖基础交易和关联关系                                          |
| M7 统计分析和视图打磨     | 未开始 | 依赖主要业务数据                                                |
| M8 部署准备和日常维护     | 未开始 | 依赖核心功能稳定                                                |

## 已完成记录

### 2026-05-21：M2 第一轮首页快捷录入

完成内容：

- 新增快捷模板数据访问层：`src/features/quick-entry/data.ts`。
- 首页快捷入口改为读取 `quick_entry_templates`，不再把快捷按钮写死在页面组件中。
- 首页新增本月结余指标，并继续展示本月收入、本月支出、JPY 资产和 CNY 资产。
- 新增通用 UI 组件：
  - `src/components/ui/action-tile.tsx`
  - `src/components/ui/inline-alert.tsx`
  - `src/components/ui/metric-cell.tsx`
- 新增快捷记账页面：`src/app/quick-entry/[id]/page.tsx`。
- 首页快捷记账入口改为 modal 交互：
  - 点击快捷卡片不离开首页。
  - modal 打开后金额输入自动聚焦。
  - modal 内保留“完整录入”入口，复杂交易可跳转到普通交易页。
  - `/quick-entry/[id]` 页面继续保留为直接访问的兜底入口。
- 快捷记账保存共用 M1 的交易余额影响规则：
  - 模板记录从数据库读取分类、账户、支付方式和币种。
  - 用户只需要填写金额、日期和备注。
  - 保存后回到首页，并展示保存成功提示。
- 新增临时记录入口：`/quick-entry/temp`。
  - 默认保存为 JPY 支出。
  - 备注标记为“临时记录，待补全”。
  - 后续可从交易页编辑补充细节。
- 补充快捷卡片、支付方式主题色、轻量 hover 动效和大金额输入样式。

验证结果：

```bash
npm run format
npm run lint
npm run build
```

以上命令均已通过。

页面 smoke test：

```text
http://localhost:3000/
http://localhost:3000/quick-entry/grocery
http://localhost:3000/quick-entry/temp
```

首页能看到 8 个数据库快捷模板和 1 个临时记录入口。快捷模板页和临时记录页均能显示金额输入、日期和保存按钮。

暂未完成：

- 还没有做完整的真实浏览器保存验收，避免自动测试污染本地真实记账数据。
- 快捷模板管理页面尚未实现，当前模板仍来自 seed 数据。

### 2026-05-21：M1 第二轮交易编辑和回滚

完成内容：

- 新增交易编辑页面：`src/app/transactions/[id]/page.tsx`。
- 交易列表新增编辑和删除入口。
- 新增交易查询函数：`getTransaction`。
- 新增交易 Server Actions：
  - `updateTransaction`
  - `deleteTransaction`
- 编辑交易时先撤销旧交易的余额影响，再应用新交易的余额影响。
- 删除交易时撤销旧交易的余额影响，再删除交易记录。
- 交易创建、编辑、删除统一走余额影响计算函数。
- 账户创建、账户编辑、交易创建、交易编辑的表单错误会回到页面内展示。
- 新增金额输入格式化函数：`formatMinorForInput`。
- 补充交易操作按钮和错误状态样式。
- 修复 better-sqlite3 写入没有实际执行的问题：
  - Drizzle 写入、更新和删除语句现在显式调用 `.run()`。
  - 影响范围包括账户创建、账户编辑、交易创建、交易编辑、交易删除和余额更新。

验证结果：

```bash
npm run lint
npm run build
```

以上命令均已通过。

页面 smoke test：

```bash
npm run dev
curl -L http://localhost:3000/
curl -L http://localhost:3000/accounts
curl -L http://localhost:3000/accounts/alipay-balance
curl -L http://localhost:3000/transactions
curl -L http://localhost:3000/transactions/missing
```

首页、账户列表、账户编辑、交易列表均返回 200；缺失交易详情返回 404。

验收补充：

- 已通过真实浏览器流程验证交易录入、编辑和删除。

暂未完成：

- 账户删除或停用，推迟到后续账户管理增强阶段。

### 2026-05-20：M1 第一轮基础闭环

完成内容：

- 新增账户数据访问函数：`src/features/accounts/data.ts`。
- 新增交易列表查询：`src/features/transactions/data.ts`。
- 新增交易表单所需 lookup 查询：`src/features/lookups/data.ts`。
- 新增首页摘要查询：`src/features/dashboard/data.ts`。
- 新增账户 Server Actions：
  - `createAccount`
  - `updateAccount`
- 新增交易 Server Action：
  - `createTransaction`
- 建立交易余额影响规则：
  - 收入增加目标账户。
  - 支出减少来源账户。
  - 转账减少来源账户并增加目标账户。
  - 调整按差额调整目标账户。
- 交易写入和账户余额更新放在同一个 SQLite 事务中。
- 新增账户页面：`src/app/accounts/page.tsx`。
- 新增账户编辑页面：`src/app/accounts/[id]/page.tsx`。
- 新增交易页面：`src/app/transactions/page.tsx`。
- 首页改为读取真实账户余额、月度摘要和最近交易。
- 补充 M1 页面样式。

验证结果：

```bash
npm run lint
npm run build
```

以上命令均已通过。

页面 smoke test：

```bash
npm run dev
curl http://localhost:3000/
curl http://localhost:3000/accounts
curl http://localhost:3000/transactions
```

以上页面均返回 200。当前本地访问建议使用 `http://localhost:3000`。

暂未完成：

- 账户删除或停用，推迟到后续账户管理增强阶段。

### 2026-05-20：M0 项目基线

完成内容：

- 新增开发流程规划文档：`docs/development-plan.md`。
- 将金额字段调整为整数最小单位：
  - JPY 使用日元整数。
  - CNY 使用分。
- 更新数据库 schema：
  - 账户余额使用 `balanceMinor`。
  - 交易、周期项目、退款、分期金额使用 `amountMinor` 或对应 minor 字段。
  - 新增 `postedOn` 字段，为信用卡入账日、退款到账日等场景预留。
  - 新增 `quick_entry_templates` 表，为快捷录入提供数据入口。
- 新增数据库客户端：`src/db/client.ts`。
  - 自动创建数据库目录。
  - 启用 SQLite WAL。
  - 启用外键约束。
- 新增 seed 脚本：`scripts/seed.mjs`。
  - 默认账户：9 个。
  - 默认支付方式：10 个。
  - 默认分类：21 个。
  - 默认快捷模板：8 个。
  - 默认信用卡配置：2 个。
- 生成首个 Drizzle migration：
  - `src/db/migrations/0000_orange_captain_america.sql`
- 新增 npm 脚本：
  - `db:seed`
  - `db:setup`
- 更新 README，补充数据库初始化、常用命令和金额存储策略。

验证结果：

```bash
npm run db:setup
npm run lint
npm run build
```

以上命令均已通过。

## 当前文件变更概览

M0 涉及的核心文件：

- `src/db/schema.ts`
- `src/db/client.ts`
- `src/db/migrations/0000_orange_captain_america.sql`
- `src/db/migrations/meta/0000_snapshot.json`
- `src/db/migrations/meta/_journal.json`
- `src/domain/finance.ts`
- `scripts/seed.mjs`
- `package.json`
- `.gitignore`
- `README.md`
- `docs/development-plan.md`
- `docs/progress.md`

M1 第一轮涉及的核心文件：

- `src/app/actions/accounts.ts`
- `src/app/actions/transactions.ts`
- `src/app/accounts/page.tsx`
- `src/app/accounts/[id]/page.tsx`
- `src/app/transactions/page.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/features/accounts/data.ts`
- `src/features/dashboard/data.ts`
- `src/features/lookups/data.ts`
- `src/features/transactions/data.ts`
- `src/lib/dates.ts`
- `src/domain/finance.ts`

M1 第二轮涉及的核心文件：

- `src/app/actions/accounts.ts`
- `src/app/actions/transactions.ts`
- `src/app/accounts/page.tsx`
- `src/app/accounts/[id]/page.tsx`
- `src/app/transactions/page.tsx`
- `src/app/transactions/[id]/page.tsx`
- `src/app/globals.css`
- `src/features/transactions/data.ts`
- `src/domain/finance.ts`

M2 第一轮涉及的核心文件：

- `src/app/actions/transactions.ts`
- `src/app/page.tsx`
- `src/app/quick-entry/[id]/page.tsx`
- `src/app/globals.css`
- `src/components/ui/action-tile.tsx`
- `src/components/ui/inline-alert.tsx`
- `src/components/ui/metric-cell.tsx`
- `src/features/quick-entry/data.ts`
- `src/features/quick-entry/quick-entry-modal.tsx`
- `docs/progress.md`

## 下一步：M2 手动保存验收和录入体验微调

建议执行顺序：

1. 手动点击一个快捷模板，保存一笔真实小额交易。
2. 确认首页最近记录、月度支出和账户余额同步变化。
3. 从交易页编辑或删除这笔快捷记录，确认余额仍能正确回滚。
4. 在手机视口检查快捷卡片、金额输入和按钮尺寸。
5. 根据实际使用感受调整模板顺序、默认账户和支付方式。

M2 验收标准：

- [x] 首页快捷入口来自 `quick_entry_templates`。
- [x] 快捷模板会预填分类、账户、支付方式、币种和日期。
- [x] 常用支出可以通过首页 modal 录入，不必打开完整交易表单。
- [x] 首页概览和最近记录读取真实交易数据。
- [x] 临时记录入口已建立，可保存后再补全。
- [ ] 已通过真实浏览器保存、编辑、删除闭环验收。

M1 验收标准：

- [x] 可以创建和编辑账户。
- [x] 可以创建收入、支出、转账、调整四类交易。
- [x] 收入会增加目标账户余额。
- [x] 支出会减少来源账户余额。
- [x] 转账会同时减少来源账户、增加目标账户，且不计入消费统计。
- [x] 调整可以校准单个账户余额。
- [x] 基础交易列表可以展示真实数据。
- [x] 可以编辑和删除交易，并正确回滚余额影响。
- [x] 页面内可以展示表单错误。
- [x] 已通过完整浏览器手动录入验收。

## 风险和注意事项

- 交易创建、编辑和删除已经统一走余额影响规则，并已通过基础真实浏览器验收。
- 信用卡还款后续必须保持为转账，不应进入支出统计。
- 快捷模板已经入库，M2 开始时应从数据库读取，不再把快捷按钮写死在首页组件里。
- 本地数据库 `data/flowledger.db` 不进入版本控制，迁移文件必须进入版本控制。

## 待确认问题

- 账户初始余额当前允许在创建账户时直接填写，后续是否改为强制通过调整交易产生仍待确认。
- M1 当前已支持交易创建、编辑和删除。
- 调整交易当前表达为“增加/减少某个差额”，不是“调整到某个余额”。
