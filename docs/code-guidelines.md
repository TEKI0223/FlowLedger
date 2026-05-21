# FlowLedger 代码规范

最后更新：2026-05-21

## 1. 目标

代码规范的目标不是追求抽象本身，而是让 FlowLedger 在功能越来越多时仍然容易读、容易改、容易验证。财务应用的核心风险在于口径混乱和余额错误，所以代码组织应优先让业务规则清晰可追踪。

## 2. 目录结构

建议保持以下分层：

```text
src/app/                 App Router 页面、布局、Server Actions 入口
src/app/actions/         表单提交和写操作
src/components/ui/       通用 UI 原语
src/components/finance/  财务领域通用组件
src/db/                  数据库 client、schema、migrations
src/domain/              纯领域类型、金额、日期、交易影响规则
src/features/            按业务功能组织查询和组合逻辑
src/lib/                 通用工具
docs/                    需求、计划、规范、进度
```

页面组件只负责组织视图，不直接写复杂 SQL，不直接实现财务规则。

## 3. 命名规则

- 文件名：使用 kebab-case 或 Next.js 约定文件名，例如 `page.tsx`、`quick-entry-panel.tsx`。
- React 组件：使用 PascalCase，例如 `QuickActionTile`。
- 服务函数：使用动词开头，例如 `listTransactions`、`getDashboardSummary`。
- Server Action：使用明确动作名，例如 `createTransaction`、`updateAccount`。
- 金额字段：统一使用 `Minor` 后缀，例如 `amountMinor`、`balanceMinor`。
- 日期字段：业务日期使用 `occurredOn`、`postedOn`，时间戳使用 `createdAt`、`updatedAt`。

## 4. 代码可读性

- 一个函数只做一类事情。解析表单、校验、写库、计算余额影响应拆开。
- 财务规则放在 `src/domain/`，不要散落在页面组件里。
- 查询函数放在 `src/features/*/data.ts`，页面只调用查询结果。
- 条件复杂时优先提前返回，避免深层嵌套。
- 对象字段保持业务顺序：id、日期、类型、金额、币种、账户、分类、备注、时间戳。
- 注释只解释不明显的业务约束，例如“信用卡还款是转账，不是支出”。

## 5. Server Actions 规范

- Server Action 只处理一个明确操作。
- 表单输入必须经过 Zod 或等价校验。
- 写操作必须显式执行，当前 SQLite 驱动下 Drizzle 写入要调用 `.run()`。
- 多表写入或余额变化必须放进事务。
- 交易编辑必须先回滚旧影响，再应用新影响。
- 失败时优先回到当前页面显示错误，不让用户进入通用错误页。

## 6. 组件规范

### 6.1 通用 UI 组件

后续建议沉淀这些组件：

- `Button`：primary、secondary、ghost、danger。
- `IconButton`：仅图标按钮，必须有 `aria-label`。
- `ActionTile`：快捷记账按钮。
- `MetricCell`：概览数字。
- `SegmentedControl`：交易类型、币种等少量互斥选项。
- `SelectField`：标准选择输入。
- `AmountInput`：金额输入。
- `InlineAlert`：错误、提示、确认反馈。

通用组件只处理视觉和交互，不包含具体业务规则。

### 6.2 财务领域组件

后续建议沉淀这些组件：

- `MoneyText`：统一金额展示。
- `AccountPicker`：账户选择。
- `CategoryPicker`：分类选择。
- `PaymentMethodPicker`：支付方式选择。
- `TransactionListItem`：交易列表项。
- `QuickEntryPanel`：快捷录入面板。

财务组件可以理解业务字段，但不能直接写数据库。

## 7. 表单原则

FlowLedger 的录入体验应尽量避免“大表单感”：

- 高频路径使用大按钮、默认值和少量输入。
- 金额是第一输入重点。
- 日期默认今天，隐藏复杂字段或降级为次级选项。
- 分类、账户、支付方式优先由模板带出。
- 完整表单保留在普通交易页，用于低频复杂记录。

## 8. 验证规则

每次完成阶段性功能都运行：

```bash
npm run format
npm run lint
npm run build
```

提交前可以用 `npm run format:check`
确认没有遗漏格式化。Prettier 是统一格式入口，不手工争论换行、缩进和逗号风格。

涉及交易逻辑时必须手动验证：

- 创建收入。
- 创建支出。
- 创建转账。
- 创建调整。
- 编辑交易后余额回滚和重新应用。
- 删除交易后余额恢复。

## 9. Git 规范

- 小步提交，提交信息描述业务结果。
- 不提交 `data/`、`.next/`、`node_modules/`。
- 迁移文件必须提交。
- 文档和代码变化相关时一起提交。
