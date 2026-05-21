const quickActions = [
  {
    name: "超市",
    detail: "饮食 / Apple Pay",
    amount: "¥2,840",
    tone: "indigo",
  },
  {
    name: "便利店",
    detail: "饮食 / PayPay",
    amount: "¥780",
    tone: "cyan",
  },
  {
    name: "外食",
    detail: "饮食 / 信用卡 A",
    amount: "¥1,600",
    tone: "coral",
  },
  {
    name: "交通",
    detail: "交通 / 现金",
    amount: "¥230",
    tone: "amber",
  },
  {
    name: "网购",
    detail: "购物 / 平台标签",
    amount: "自填",
    tone: "indigo",
  },
  {
    name: "现金消费",
    detail: "现金账户扣减",
    amount: "自填",
    tone: "slate",
  },
];

const recentTransactions = [
  ["超市", "今天 19:12 / Apple Pay", "-¥2,840", "expense"],
  ["PayPay 充值", "昨天 / 日本银行账户 -> PayPay", "转账", "transfer"],
  ["工资", "5月25日 / 日本银行账户", "+¥420,000", "income"],
];

const accounts = [
  ["日本银行账户", "¥620,000"],
  ["PayPay", "¥5,420"],
  ["日元现金", "¥12,400"],
  ["微信余额", "¥1,260"],
];

const paymentThemes = [
  ["AP", "Apple Pay", "信用卡 A", "indigo"],
  ["PP", "PayPay", "余额账户", "cyan"],
  ["CC", "信用卡", "账单周期", "indigo"],
  ["BK", "银行账户", "转账 / 工资", "slate"],
  ["CA", "现金", "现金消费", "amber"],
  ["WX", "微信支付", "人民币余额", "green"],
];

export default function DesignDemoPage() {
  return (
    <main className="demo-shell">
      <header className="demo-header">
        <div>
          <p className="demo-kicker">2026年5月</p>
          <h1>FlowLedger</h1>
          <p>打开后马上记账，少填字段，多用默认值。</p>
        </div>
        <button className="demo-icon-button" type="button" aria-label="打开设置">
          <span aria-hidden="true">UI</span>
        </button>
      </header>

      <section className="demo-metrics" aria-label="财务概览样式">
        <div>
          <span>本月支出</span>
          <strong>-¥126,480</strong>
          <small>不含转账</small>
        </div>
        <div>
          <span>本月收入</span>
          <strong>+¥420,000</strong>
          <small>工资已确认</small>
        </div>
        <div>
          <span>净资产</span>
          <strong>¥812,900</strong>
          <small>JPY 账户</small>
        </div>
      </section>

      <div className="demo-layout">
        <section className="demo-main-panel" aria-label="快捷记账样式">
          <div className="demo-section-heading">
            <div>
              <h2>快捷记账</h2>
              <p>点一个常用场景，只输入金额就能保存。</p>
            </div>
            <button className="demo-secondary-button" type="button">
              管理模板
            </button>
          </div>

          <div className="demo-action-grid">
            {quickActions.map((action) => (
              <button className={`demo-action-tile ${action.tone}`} type="button" key={action.name}>
                <span className="demo-action-mark" aria-hidden="true">
                  +
                </span>
                <strong>{action.name}</strong>
                <small>{action.detail}</small>
                <em>{action.amount}</em>
              </button>
            ))}
          </div>

          <section className="demo-entry-panel" aria-label="金额输入样式">
            <div className="demo-entry-top">
              <div>
                <span>当前选择</span>
                <strong>超市 / Apple Pay</strong>
              </div>
              <button className="demo-secondary-button" type="button">
                今天
              </button>
            </div>
            <label className="demo-amount-input">
              <span>金额</span>
              <input inputMode="decimal" placeholder="0" aria-label="金额" />
            </label>
            <div className="demo-chip-row" aria-label="默认字段">
              <button type="button">饮食</button>
              <button type="button">
                <span className="demo-mini-badge indigo" aria-hidden="true">
                  AP
                </span>
                信用卡 A
              </button>
              <button type="button">JPY</button>
            </div>
            <button className="demo-save-button" type="button">
              保存支出
            </button>
          </section>

          <section className="demo-payment-panel" aria-label="支付方式主题样式">
            <div className="demo-section-heading compact">
              <h2>支付方式主题</h2>
              <span>颜色和图标会统一</span>
            </div>
            <div className="demo-payment-grid">
              {paymentThemes.map(([icon, name, detail, tone]) => (
                <button className={`demo-payment-card ${tone}`} type="button" key={name}>
                  <span className={`demo-payment-icon ${tone}`} aria-hidden="true">
                    {icon}
                  </span>
                  <strong>{name}</strong>
                  <small>{detail}</small>
                </button>
              ))}
            </div>
          </section>
        </section>

        <aside className="demo-side" aria-label="账户和记录样式">
          <section>
            <div className="demo-section-heading compact">
              <h2>账户余额</h2>
              <span>4 个常用</span>
            </div>
            <div className="demo-account-list">
              {accounts.map(([name, balance]) => (
                <div key={name}>
                  <span>{name}</span>
                  <strong>{balance}</strong>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="demo-section-heading compact">
              <h2>最近记录</h2>
              <span>今天</span>
            </div>
            <div className="demo-transaction-list">
              {recentTransactions.map(([name, detail, amount, type]) => (
                <article key={name}>
                  <div>
                    <strong>{name}</strong>
                    <span>{detail}</span>
                  </div>
                  <em className={type}>{amount}</em>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
