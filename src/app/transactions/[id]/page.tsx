import Link from "next/link";
import { notFound } from "next/navigation";
import { updateTransaction } from "@/app/actions/transactions";
import { getTransactionLookups } from "@/features/lookups/data";
import { getTransaction } from "@/features/transactions/data";
import {
  currencies,
  currencyLabels,
  formatMinorForInput,
  transactionTypeLabels,
} from "@/domain/finance";

export const dynamic = "force-dynamic";

type TransactionEditPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function TransactionEditPage({
  params,
  searchParams,
}: TransactionEditPageProps) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [transaction, lookups] = await Promise.all([getTransaction(id), getTransactionLookups()]);

  if (!transaction) {
    notFound();
  }

  const action = updateTransaction.bind(null, transaction.id);

  return (
    <main className="shell narrow-shell">
      <header className="topbar">
        <div className="brand">
          <Link className="back-link" href="/transactions">
            ← 交易
          </Link>
          <h1 className="brand-title">编辑交易</h1>
          <p className="brand-subtitle">保存时会自动回滚旧余额影响并应用新影响</p>
        </div>
      </header>

      <section className="task">
        {error ? <p className="form-error">{error}</p> : null}
        <form action={action} className="form-grid">
          <label>
            <span>日期</span>
            <input name="occurredOn" type="date" required defaultValue={transaction.occurredOn} />
          </label>

          <label>
            <span>类型</span>
            <select name="type" required defaultValue={transaction.type}>
              {Object.entries(transactionTypeLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>金额</span>
            <input
              name="amount"
              inputMode="decimal"
              required
              defaultValue={formatMinorForInput({
                amountMinor: transaction.amountMinor,
                currency: transaction.currency,
              })}
            />
          </label>

          <label>
            <span>币种</span>
            <select name="currency" required defaultValue={transaction.currency}>
              {currencies.map((currency) => (
                <option value={currency} key={currency}>
                  {currency} · {currencyLabels[currency]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>分类</span>
            <select name="categoryId" defaultValue={transaction.categoryId ?? ""}>
              <option value="">无分类</option>
              {lookups.categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>来源账户</span>
            <select name="sourceAccountId" defaultValue={transaction.sourceAccountId ?? ""}>
              <option value="">不选择</option>
              {lookups.accounts.map((account) => (
                <option value={account.id} key={account.id}>
                  {account.name} · {account.currency}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>目标账户</span>
            <select name="targetAccountId" defaultValue={transaction.targetAccountId ?? ""}>
              <option value="">不选择</option>
              {lookups.accounts.map((account) => (
                <option value={account.id} key={account.id}>
                  {account.name} · {account.currency}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>支付方式</span>
            <select name="paymentMethodId" defaultValue={transaction.paymentMethodId ?? ""}>
              <option value="">不选择</option>
              {lookups.paymentMethods.map((paymentMethod) => (
                <option value={paymentMethod.id} key={paymentMethod.id}>
                  {paymentMethod.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>备注</span>
            <textarea name="note" rows={3} defaultValue={transaction.note ?? ""} />
          </label>

          <button className="primary-action" type="submit">
            保存修改
          </button>
        </form>
      </section>
    </main>
  );
}
