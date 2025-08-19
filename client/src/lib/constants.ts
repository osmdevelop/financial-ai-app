export const ASSET_TYPE_COLORS = {
  equity: "bg-primary text-primary-foreground",
  etf: "bg-success text-success-foreground",
  crypto: "bg-purple text-purple-foreground",
} as const;

export const ASSET_TYPE_LABELS = {
  equity: "Equity",
  etf: "ETF", 
  crypto: "Crypto",
} as const;

export const CRYPTO_SYMBOL_MAP = {
  "BTC-USD": "bitcoin",
  "ETH-USD": "ethereum", 
  "ADA-USD": "cardano",
  "SOL-USD": "solana",
} as const;

export const formatCurrency = (amount: number, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};

export const formatPercent = (percent: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percent / 100);
};

export const formatNumber = (number: number, decimals = 2) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};
