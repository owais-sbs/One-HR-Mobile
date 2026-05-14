export function normalizeCurrencyCode(code?: string | null): string {
  return (code || "").trim().toUpperCase();
}

export function getCurrencySymbol(code?: string | null): string {
  const normalized = normalizeCurrencyCode(code);
  if (!normalized) return "$";

  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency",
      currency: normalized,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);

    return parts.find((part) => part.type === "currency")?.value || normalized;
  } catch {
    return normalized;
  }
}

export function formatCurrency(
  value?: number | null,
  currencyCodeOrSymbol?: string | null,
  options?: { decimals?: number; useSymbol?: boolean },
): string {
  const amount = value ?? 0;
  const currencyCode = normalizeCurrencyCode(currencyCodeOrSymbol);
  const symbol = currencyCode ? getCurrencySymbol(currencyCode) : "$";
  const decimals = options?.decimals ?? 2;

  if (options?.useSymbol) {
    return `${symbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode || "USD",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    return `${symbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }
}
