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
- **错误反馈走 `useActionState`**：Server Action 签名是 `(prevState, formData) => ActionState`，返回
  `{ ok: false, error, fieldValues }`，表单内联展示错误并保留用户已输入的字段。禁止
  `redirect(?error=...)` 这种把表单状态冲掉的写法。
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

### 8.1 样式技术栈

样式层使用 **Tailwind CSS v4 + shadcn/ui（base-nova 风格） + Base UI primitives +
lucide-react 图标**。设计 token 通过 `globals.css` 的 CSS 变量声明，所有组件样式通过 Tailwind
utility class 写在 JSX 里。

- `globals.css` 只放：`@import "tailwindcss"`、设计 token (`:root` / `.dark`
  下的 CSS 变量)、`@theme inline { ... }` 把变量暴露给 Tailwind、`@layer base`
  的全局重置。**不再增长任何自定义业务 class**。
- 通用 UI 原语在 `src/components/ui/`，由 shadcn
  CLI 生成或派生（Button、Card、Dialog、Input、Label、Textarea、Alert、Badge、Separator、Skeleton 等）。需要新组件时优先用
  `npx shadcn@latest add <name>` 拉取。
- 财务领域组件在 `src/components/finance/`，包装通用原语并加入业务语义。
- 组合 class 用 `cn()`（位于 `src/lib/utils.ts`，clsx + tailwind-merge）。
- 不写 CSS Modules、不写 SCSS、不写新的全局 class。

### 8.2 Mobile-first

Tailwind 的断点前缀本身就是 mobile-first：默认值是手机，`sm:`、`md:`、`lg:`
越往大屏越宽。**直接利用，不要反向覆盖**。

```tsx
// 正确：默认单列，md (≥768px) 开始铺开为 4 列
<div className="grid grid-cols-1 gap-3 md:grid-cols-4">

// 错误：默认 4 列，反向收回到 1 列
<div className="grid grid-cols-4 max-md:grid-cols-1">
```

FlowLedger 使用 Tailwind 默认断点：`sm: 640px / md: 768px / lg: 1024px / xl: 1280px`。手机/桌面分界用
`md`。

### 8.3 触屏强制约束

- hover 效果用 Tailwind 自带的 `hover:`（Tailwind 默认就只在指针设备生效，等价于
  `@media (hover: hover)`）。
- 视口高度用 `h-dvh` / `min-h-dvh`，不用 `h-screen`。
- 主容器底部用 `pb-[max(1rem,env(safe-area-inset-bottom))]` 给 home indicator 留位。
- 可点击区域最小 44×44（`min-h-11 min-w-11`），列表项最小 56px。
- 表单输入 `text-base` 起步（即 16px），防 iOS Safari 自动放大。shadcn 的 Input/Textarea 默认
  `text-sm md:text-base` — 在 FlowLedger 里覆盖为 `text-base`。

### 8.4 颜色与暗色模式

- 颜色用 shadcn 语义 token：`bg-background` / `text-foreground` / `text-muted-foreground` /
  `bg-card` / `border-border` / `bg-destructive` 等。**不要直接写 `bg-white` / `text-black` /
  `bg-gray-100`**，会在暗色模式下出问题。
- 财务语义色用我们扩展的 token：`text-income` / `text-expense` / `text-transfer` /
  `text-adjustment`（在 globals.css `@theme` 里声明）。
- 暗色模式通过 `next-themes` 注入到 `<html class="dark">`。组件代码默认不需要写 `dark:` 前缀，shadcn
  token 已经在 `.dark` 下重新映射；只在需要明暗差异化（比如某个特定的 hover 颜色）时才用 `dark:`。

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

- 样式用 **Tailwind v4**，组件用 **shadcn/ui (base-nova)**，primitives 用 **@base-ui/react**，图标用
  **lucide-react**，暗色模式用 **next-themes**，动画用 **tw-animate-css**。
- class 组合用 `cn()`（位于 `src/lib/utils.ts`）。
- 日期运算用 `dayjs`，不要手写 `Date` 加减。`src/lib/dates.ts` 是统一入口。
- 表单校验用 `zod`，在 Server Action 边界一次性校验。
- ORM 用 `drizzle-orm`，迁移用 `drizzle-kit`。所有写操作显式 `.run()`。
- 单元测试用 `vitest`。

## 11. Git 规范

- 小步提交，提交信息描述业务结果。
- 不提交 `data/`、`.next/`、`node_modules/`。
- 迁移文件必须提交。
- 文档和代码变化相关时一起提交。
