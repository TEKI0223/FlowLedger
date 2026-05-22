# FlowLedger UI 方向

最后更新：2026-05-23

## 0. 技术栈

样式层：**Tailwind CSS v4 + shadcn/ui（base-nova 风格） + Base UI primitives + lucide-react +
next-themes**。

- 设计 token：通过 `src/app/globals.css` 的 CSS 变量声明（oklch 色彩空间）。
- 组件原语：`src/components/ui/` 下的 Button / Card / Dialog / Input / Label / Textarea / Alert /
  Badge / Separator / Skeleton 等，由 shadcn CLI 生成。
- 财务领域组件：`src/components/finance/`，包装通用原语并加入业务语义。
- class 组合：`cn()` from `src/lib/utils.ts`。
- 暗色模式：跟随系统，通过 `next-themes` 注入 `.dark` class。

## 1. 设计目标

FlowLedger 应该像一个安静、现代、反应快速的个人财务控制台。它不是营销页，也不是传统厚重记账本。第一屏要直接可操作，让用户打开后马上能完成“记一笔”“看余额”“处理待办”。

关键词：

- 直观
- 现代
- 快速
- 轻量
- 可信
- 手机优先

## 2. 体验原则

- 高频操作用按钮，不用大批表单。
- 首页优先展示今天能做什么，而不是解释系统功能。
- 快捷录入只要求用户输入必要信息，默认值来自模板。
- 完整交易表单保留，但不作为默认体验中心。
- 页面视觉应清爽、留白适中、层级明确。
- 操作反馈必须明显：保存成功、保存失败、余额变化都要看得见。
- 动效要轻，不做夸张弹跳或大幅位移。

## 3. 字体

当前建议使用系统字体栈：

```css
font-family:
  "PingFang SC",
  "Hiragino Sans GB",
  "Microsoft YaHei UI",
  "Microsoft YaHei",
  "Noto Sans CJK SC",
  "Noto Sans SC",
  "Hiragino Sans",
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  ui-sans-serif,
  system-ui,
  sans-serif;
```

原因：

- 不依赖外部字体加载。
- 中文优先使用 `PingFang SC`，避免英文优先字体触发 CJK fallback 后字重不均。
- Windows 使用 `Microsoft YaHei UI`，Linux 或缺省环境回落到 Noto Sans CJK/SC。
- 配合 `font-synthesis: none`，减少浏览器伪加粗造成的笔画灰度不均。

字重原则：

- 中文正文使用 400。
- 常规强调使用 600-700。
- 避免 800/900 用在连续中文上。
- 金额数字可以使用 700，并开启 tabular numbers 保持列对齐。
- 不使用英文优先字体作为主字体，避免中文 fallback 后连续汉字粗细不均。

如果后续需要跨系统完全一致，再考虑自托管 `Noto Sans SC` 或
`Source Han Sans SC`，但会增加字体资源体积。

## 4. 字号

建议字号层级：

| 用途     | 字号    | 说明                         |
| -------- | ------- | ---------------------------- |
| 页面标题 | 24-28px | 只用于页面主标题             |
| 区块标题 | 17-20px | 用于概览、快捷录入、最近记录 |
| 重要数字 | 24-32px | 资产、收支、余额             |
| 正文     | 14-15px | 列表、说明、按钮主文字       |
| 辅助信息 | 12-13px | 日期、账户、分类、提示       |

不使用随视口变化的字体大小，避免移动端不可控。

## 5. 颜色

建议改成更现代的中性色底加多色状态，不继续扩大米色主题。

核心色：

| Token               | 色值      | 用途               |
| ------------------- | --------- | ------------------ |
| `--surface-base`    | `#f7f8fb` | 页面背景           |
| `--surface-panel`   | `#ffffff` | 面板、列表项       |
| `--text-main`       | `#14171f` | 主文字             |
| `--text-muted`      | `#69707d` | 次级文字           |
| `--line-soft`       | `#e5e8ef` | 边框               |
| `--accent-income`   | `#3f8173` | 收入、确认、主保存 |
| `--accent-transfer` | `#2563eb` | 转账、信息         |
| `--accent-expense`  | `#e25555` | 支出、危险操作     |
| `--accent-pending`  | `#b7791f` | 待处理、提醒       |

颜色使用原则：

- 页面整体以浅灰中性底为主。
- 不使用淡黄色、米色、旧纸张感背景。
- 收入色使用低饱和 sage green，不使用刺眼亮绿。
- 支出、收入、转账、提醒分别使用不同强调色。
- 边框比阴影更常用，阴影只给浮层或重点按钮。

### 5.1 交易类型颜色

| 类型 | 颜色       | 用途                 |
| ---- | ---------- | -------------------- |
| 收入 | sage green | 金额、确认反馈       |
| 支出 | coral red  | 金额、删除危险态     |
| 转账 | blue       | 转账标签、账户间移动 |
| 调整 | amber      | 余额校准、非日常流水 |

### 5.2 支付方式主题

支付方式建议同时有图标和主题色，帮助用户扫一眼知道资金来源。

| 支付方式          | 徽标占位 | 图标方向      | 主题色             |
| ----------------- | -------- | ------------- | ------------------ |
| 银行账户          | `BK`     | bank/building | slate              |
| 信用卡            | `CC`     | credit-card   | indigo             |
| Apple Pay         | `AP`     | card/device   | indigo 或 graphite |
| PayPay / 电子钱包 | `PP`     | wallet        | cyan               |
| 微信 / 支付宝     | `WX`     | wallet/qr     | green 或 blue      |
| 现金              | `CA`     | banknote      | amber              |

Demo 阶段先用字母徽标表达图标位，例如
`AP`、`PP`、`CC`、`BK`。正式组件阶段可引入 lucide 图标，让按钮更直观。

## 6. 圆角和间距

- 常规卡片和按钮圆角：8px。
- 小标签圆角：999px。
- 页面外边距：手机 16px，桌面 24px。
- 卡片内边距：12-18px。
- 列表项最小高度：56px。
- 快捷按钮最小高度：88px。

## 7. 页面布局

### 首页

首页建议分成四块：

1. 顶部状态栏：当前月份、净资产、小的设置入口。
2. 今日快捷录入：大按钮网格。
3. 金额输入面板：选择快捷项后突出金额输入。
4. 最近记录和待处理事项：紧凑列表。

### 交易页

交易页保留完整能力，但不做成默认入口：

- 交易列表在主区域。
- 高级筛选后续再加。
- 完整交易表单可以折叠、抽屉化或独立页面化。

### 账户页

账户页偏管理：

- 账户余额列表。
- 按 JPY/CNY 分组。
- 每个账户展示最近变动入口。

## 8. 组件视觉规范

- `ActionTile`：大面积可点，展示名称、默认账户、默认分类和状态色。
- `MetricCell`：不使用厚重卡片，像信息单元格一样排布。
- `TransactionListItem`：左侧名称和上下文，右侧金额和操作。
- `QuickEntryPanel`：金额输入最大，其他字段以 chips 或 segmented controls 呈现。
- `InlineAlert`：轻量提示，不打断流程。

### 8.1 卡片交互

快捷卡片和支付方式卡片需要有 hover 反馈，但必须收敛：

- hover 位移：最多 `translateY(-1px)`。
- hover 阴影：轻阴影，避免漂浮感过强。
- active 状态：回到 `translateY(0)` 或接近原位。
- 徽标缩放：最多 `scale(1.03)`。
- transition 时长：约 160ms。
- 不使用弹跳、旋转、大幅缩放或长动画。

### 8.2 快捷记账卡片

快捷记账卡片应包含：

- 操作名称，例如“超市”。
- 默认上下文，例如“饮食 / Apple Pay”。
- 金额提示，例如最近金额或“自填”。
- 主题徽标，用于暗示支付方式或交易类型。

卡片的主要目的不是展示信息，而是让用户快速进入记录动作。

### 8.3 支付方式卡片

支付方式卡片应包含：

- 简短徽标或图标。
- 支付方式名称。
- 资金来源提示，例如“余额账户”“账单周期”“转账 / 工资”。
- 固定主题色。

不同支付方式的主题色应该稳定，不随页面变化。

## 9. 手机端策略

### 9.1 单代码 + mobile-first

FlowLedger 是一份代码、一套组件，通过 CSS 媒体查询适配手机和桌面。不做 UA 检测、不分离 `/m/`
路由、不维护两套组件。原因：单用户使用，复制一份 UI 会立刻面临"功能漂移"的风险。

CSS 必须 **mobile-first**：默认样式就是手机视图，桌面通过 `@media (min-width)` 加宽。不要再写
`@media (max-width: 820px)` 反向覆盖。

```css
/* 正确写法 */
.summary-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 820px) {
  .summary-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
```

### 9.2 断点

只有两个断点：

- `480px`：小手机和大手机的分界，主要管字体密度和金额输入大小。
- `820px`：手机和桌面的分界，主要管布局（单列 → 多列、侧栏出现）。

不要随意增加断点，保持决策路径短。

### 9.3 容器查询 (container queries)

当组件需要根据"自己所在容器宽度"调整布局（不是根据屏幕宽度），优先使用 container
queries 而不是媒体查询。典型场景：`MetricCell` 出现在主网格或窄侧栏；`TransactionListItem`
出现在主列表或抽屉。

```css
.metric-cell-container {
  container-type: inline-size;
}

@container (min-width: 200px) {
  .metric-cell {
    /* 横排版本 */
  }
}
```

Next.js 16 + 现代浏览器全支持。M5 以后组件复用变多时再用，初期不必强求。

### 9.4 何时做"手机专属组件"

只有一种情况开新组件：**桌面根本不需要**。当前 FlowLedger 预计有两个：

- `BottomNav`：手机底部 4-5 个 tab（首页 / 交易 / 账户 / 报表 / 我的）。桌面用顶部或左侧导航，不需要底栏。
- `FloatingActionButton`：手机屏幕右下浮动 "+"，永远可点开"快捷录入"。桌面用顶部按钮。

这两个组件用 `@media (min-width: 820px) { display: none }`
在桌面隐藏。所有"密度不同的同一组件"（卡片、表单、列表）继续用 CSS 调整，不要拆。

### 9.5 触屏体验细节

强制约束：

- 所有 `:hover` 样式必须包 `@media (hover: hover)`，否则触屏会"卡 hover"。
- 视口高度用 `100dvh`，不用 `100vh`。键盘弹出时 `100vh` 会让输入被遮挡。
- 主 shell 的底部 padding 用 `max(20px, env(safe-area-inset-bottom))`，避免 PWA 安装后被 home
  indicator 遮挡。
- 所有可点击区域最小 44×44，列表项最小 56px，快捷卡片最小 88px。modal 关闭按钮也必须 44×44。
- 表单输入 `font-size >= 16px`，否则 iOS Safari 聚焦时会自动放大页面。

### 9.6 表单状态不丢失

Server Action 的错误反馈必须用 React 19 `useActionState`，在表单内联展示，**保留已输入的字段**。禁止
`redirect(?error=...)` 这种把用户输入冲掉的写法（见 code-guidelines）。

## 10. PWA Manifest 与安装

[src/app/manifest.ts](src/app/manifest.ts) 定义"添加到主屏幕"后这个 App 的外观和行为：

- `name` / `short_name`：图标下显示的名字。
- `display: "standalone"`：从图标启动时没有浏览器地址栏，看上去像原生 App。
- `theme_color` / `background_color`：状态栏和启动画面颜色，应与 [globals.css](src/app/globals.css)
  的 `--background` 保持一致。
- `start_url: "/"`：图标启动的入口。
- `orientation: "portrait-primary"`：锁定竖屏。

可选能力（后续考虑）：

- `shortcuts`：长按 App 图标的快捷菜单（Android 支持好），例如长按直接弹"超市"、"便利店"、"临时记录"。
- `icons`：完整的 PWA 图标集，包括 maskable icon。M8 完善。

manifest **不负责**离线、推送、后台同步。这些需要单独的 Service Worker，M8 才考虑。

## 11. Demo

当前 UI 方向样板在：

```text
/design-demo
```

这个页面只用于讨论视觉和交互方向，不作为正式业务入口。
