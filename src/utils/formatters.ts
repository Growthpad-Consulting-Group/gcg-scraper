/**
 * Global formatting utilities for the application
 * (subset needed by GenericTable / TableUtils).
 */

// Pre-instantiate formatters for better performance in loops
const currencyFormatters: Record<string, Intl.NumberFormat> = {
  GHS: new Intl.NumberFormat('en-GH', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  USD: new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
};

const defaultNumberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format currency with commas and a currency prefix.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = 'GHS',
  decimals: number = 2
): string {
  if (amount === null || amount === undefined || amount === '') {
    return `${currency} 0.00`;
  }

  const numAmount = parseFloat(String(amount));
  if (isNaN(numAmount)) {
    return `${currency} 0.00`;
  }

  if (currencyFormatters[currency] && decimals === 2) {
    return `${currency} ${currencyFormatters[currency].format(numAmount)}`;
  }

  try {
    return `${currency} ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numAmount)}`;
  } catch {
    return `${currency} ${numAmount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }
}

/**
 * Format number with commas (no currency symbol).
 */
export function formatNumber(
  number: number | string | null | undefined,
  decimals: number = 0
): string {
  if (number === null || number === undefined || number === '') {
    return '0';
  }

  const num = parseFloat(String(number));
  if (isNaN(num)) {
    return '0';
  }

  if (decimals === 2) {
    return defaultNumberFormatter.format(num);
  }

  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
