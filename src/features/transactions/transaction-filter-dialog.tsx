import { FilterChipGroup } from "@/components/filters/filter-chip-group";
import { FilterDialog } from "@/components/filters/filter-dialog";
import { FilterSection } from "@/components/filters/filter-section";
import { currencyLabels, transactionTypeLabels } from "@/domain/finance";
import { formatAccountName } from "@/features/accounts/labels";
import { CategoryPicker, type CategoryPickerOption } from "@/features/categories/category-picker";
import {
  countActiveTransactionFilters,
  transactionAmountFilterOptions,
  transactionDateFilterOptions,
  type TransactionFilters,
} from "./filters";

type TransactionFilterDialogProps = {
  filters: TransactionFilters;
  lookups: {
    accounts: Array<{
      id: string;
      name: string;
      lastDigits: string | null;
      currency: keyof typeof currencyLabels;
    }>;
    categories: CategoryPickerOption[];
    paymentMethods: Array<{ id: string; name: string; currency: keyof typeof currencyLabels }>;
  };
};

const typeOptions = [
  { value: "", label: "全部" },
  ...Object.entries(transactionTypeLabels).map(([value, label]) => ({ value, label })),
];

const currencyOptions = [
  { value: "", label: "全部" },
  ...Object.entries(currencyLabels).map(([value, label]) => ({
    value,
    label: `${value} · ${label}`,
  })),
];

export function TransactionFilterDialog({ filters, lookups }: TransactionFilterDialogProps) {
  const accountOptions = [
    { value: "", label: "全部" },
    ...lookups.accounts.map((account) => ({
      value: account.id,
      label: formatAccountName(account),
      description: account.currency,
    })),
  ];
  const paymentMethodOptions = [
    { value: "", label: "全部" },
    ...lookups.paymentMethods.map((paymentMethod) => ({
      value: paymentMethod.id,
      label: paymentMethod.name,
      description: paymentMethod.currency,
    })),
  ];

  return (
    <FilterDialog
      title="筛选交易"
      description="选择条件后应用到交易历史。"
      activeCount={countActiveTransactionFilters(filters)}
    >
      <FilterSection
        title="日期"
        summary={getOptionLabel(transactionDateFilterOptions, filters.date)}
      >
        <FilterChipGroup
          name="date"
          label="日期"
          hideLabel
          value={filters.date}
          options={transactionDateFilterOptions}
        />
      </FilterSection>

      <FilterSection title="支付类型" summary={getOptionLabel(typeOptions, filters.type)}>
        <FilterChipGroup
          name="type"
          label="支付类型"
          hideLabel
          value={filters.type}
          options={typeOptions}
        />
      </FilterSection>

      <FilterSection
        title="支付分类"
        summary={lookups.categories.find((category) => category.id === filters.categoryId)?.label}
      >
        <CategoryPicker
          key={filters.categoryId ?? "all-categories"}
          name="categoryId"
          categories={lookups.categories}
          defaultValue={filters.categoryId ?? ""}
          emptyLabel="全部分类"
        />
      </FilterSection>

      <FilterSection title="币种" summary={getOptionLabel(currencyOptions, filters.currency)}>
        <FilterChipGroup
          name="currency"
          label="币种"
          hideLabel
          value={filters.currency}
          options={currencyOptions}
          columns="two"
        />
      </FilterSection>

      <FilterSection
        title="金额"
        summary={getOptionLabel(transactionAmountFilterOptions, filters.amount)}
      >
        <FilterChipGroup
          name="amount"
          label="金额"
          hideLabel
          value={filters.amount}
          options={transactionAmountFilterOptions}
        />
      </FilterSection>

      <FilterSection
        title="支付方式"
        summary={getOptionLabel(paymentMethodOptions, filters.paymentMethodId)}
      >
        <FilterChipGroup
          name="paymentMethodId"
          label="支付方式"
          hideLabel
          value={filters.paymentMethodId}
          options={paymentMethodOptions}
        />
      </FilterSection>

      <FilterSection title="账户" summary={getOptionLabel(accountOptions, filters.accountId)}>
        <FilterChipGroup
          name="accountId"
          label="账户"
          hideLabel
          value={filters.accountId}
          options={accountOptions}
        />
      </FilterSection>
    </FilterDialog>
  );
}

export function getTransactionFilterLabels(
  filters: TransactionFilters,
  lookups: TransactionFilterDialogProps["lookups"],
): string[] {
  return [
    labelWithName("日期", getOptionLabel(transactionDateFilterOptions, filters.date, false)),
    labelWithName("币种", getOptionLabel(currencyOptions, filters.currency, false)),
    labelWithName("金额", getOptionLabel(transactionAmountFilterOptions, filters.amount, false)),
    labelWithName(
      "支付方式",
      getOptionLabel(
        [
          { value: "", label: "全部" },
          ...lookups.paymentMethods.map((paymentMethod) => ({
            value: paymentMethod.id,
            label: paymentMethod.name,
          })),
        ],
        filters.paymentMethodId,
        false,
      ),
    ),
    labelWithName(
      "账户",
      getOptionLabel(
        [
          { value: "", label: "全部" },
          ...lookups.accounts.map((account) => ({
            value: account.id,
            label: formatAccountName(account),
          })),
        ],
        filters.accountId,
        false,
      ),
    ),
    labelWithName("支付类型", getOptionLabel(typeOptions, filters.type, false)),
    labelWithName(
      "支付分类",
      lookups.categories.find((category) => category.id === filters.categoryId)?.label,
    ),
  ].filter((label): label is string => Boolean(label));
}

function getOptionLabel(
  options: readonly { value: string; label: string }[],
  value?: string,
  fallbackToAll = true,
): string | undefined {
  if (!value) return fallbackToAll ? "全部" : undefined;
  return options.find((option) => option.value === value)?.label;
}

function labelWithName(name: string, value?: string): string | undefined {
  return value ? `${name}: ${value}` : undefined;
}
