const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** 1234.5 → "$1,234.50" */
export const formatMoney = (amount: number) => usd.format(round2(amount));

/** Whole amounts without cents for readable breakdowns: 55 → "$55", 8.5 → "$8.50". */
export const formatMoneyCompact = (amount: number) => {
  const v = round2(amount);
  return Number.isInteger(v) ? `$${v.toLocaleString("en-US")}` : usd.format(v);
};
