export function formatAccountName(account: { name: string; lastDigits?: string | null }) {
  return account.lastDigits ? `${account.name} * ${account.lastDigits}` : account.name;
}
