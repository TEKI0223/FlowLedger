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
- **错误反馈走 `useActionState`**：Server Action 签名是 `(prevState, formData) => ActionState`，返回 `{ ok: false, error, fieldValues }`，表单内联展示错误并保留用户已输入的字段。禁止 `redirect(?error=...)` 这种把表单状态冲掉的写法。
- 提交中状态必须用 `useFormStatus` 在按钮上体现（`pending` 时禁用 + 文字变化），防止重复提交。

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

## 8. 样式规范

### 8.1 CSS 组织

- `globals.css` 只放：reset、设计 token (CSS 变量)、字体声明、`html / body` 等全局基础样式。不再继续增长页面级或组件级样式。
- 组件级样式用 **CSS Modules**，文件与组件同名同目录：`action-tile.tsx` 配 `action-tile.module.css`。
- 页面级样式同上，放在路由目录下：`src/app/accounts/accounts.module.css`。

### 8.2 Mobile-first CSS

所有新写的样式必须 **mobile-first**：默认是手机视图，桌面用 `@media (min-width)` 加宽。禁止 `@media (max-width)` 反向覆盖。

```css
/* 正确 */
.summary-grid { grid-template-columns: 1fr; }
@media (min-width: 820px) { .summary-grid { grid-template-columns: repeat(4, 1fr); } }

/* 错误 */
.summary-grid { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 820px) { .summary-grid { grid-template-columns: 1fr; } }
```

### 8.3 触屏强制约束

- `:hover` 必须包 `@media (hover: hover)`，否则触屏会"卡 hover"。
- 视口高度用 `100dvh`，不用 `100vh`。
- 主容器底部用 `max(20px, env(safe-area-inset-bottom))` 给 home indicator 留位。
- 可点击区域最小 44×44，列表项最小 56px。
- 表单 `input` / `textarea` / `select` 的 `font-size >= 16px`，防 iOS Safari 自动放大。

### 8.4 断点

只有两个断点：`480px`（手机内部密度）和 `820px`（手机/桌面分界）。不要随意增加。

详细的手机端策略见 [ui-direction.md](ui-direction.md) §9。

## 9. 测试规则

### 9.1 domain 层必须有单元测试

`src/domain/` 下每个导出函数都要有对应的 vitest 单元测试。这是整个应用对错的核心，不能依赖手动验证。

测试文件就近放：`src/domain/finance.ts` → `src/domain/finance.test.ts`。

常规覆盖目标：

- 金额解析和格式化的往返一致性、边界值、非法输入。
- 余额影响函数对四种交易类型 + 缺账户场景的输出。
- 周期项目下一次日期计算（M3 加入）。
- 信用卡账单周期归属（M4 加入）。

### 9.2 验证命令

每次完成阶段性功能都运行：

```bash
npm run format
npm run lint
npm run test
npm run build
```

提交前可以用 `npm run format:check` 确认没有遗漏格式化。Prettier 是统一格式入口。

### 9.3 手动验证保留交易关键路径

涉及交易逻辑时单元测试之外还要在浏览器手动验证：

- 创建收入。
- 创建支出。
- 创建转账。
- 创建调整。
- 编辑交易后余额回滚和重新应用。
- 删除交易后余额恢复。

## 10. 依赖和工具

- 日期运算用 `dayjs`，不要手写 `Date` 加减。`src/lib/dates.ts` 是统一入口。
- 表单校验用 `zod`，在 Server Action 边界一次性校验。
- ORM 用 `drizzle-orm`，迁移用 `drizzle-kit`。所有写操作显式 `.run()`。
- 单元测试用 `vitest`，与 Next.js 共用 TS 配置。
- 不引入 UI 组件库（Tailwind / shadcn / MUI 等），保持 CSS 自有可控。

## 11. Git 规范

- 小步提交，提交信息描述业务结果。
- 不提交 `data/`、`.next/`、`node_modules/`。
- 迁移文件必须提交。
- 文档和代码变化相关时一起提交。
