/**
 * Unit Conversion Utilities
 * Quy đổi đơn vị lớn/nhỏ theo QT001
 */

/**
 * Convert from large unit to small unit
 * VD: 2.17 túi × 100 lọ/túi = 217 lọ
 */
export function convertLargeToSmall(
  quantityLarge: number,
  conversionRatio: number
): number {
  if (conversionRatio <= 0) {
    throw new Error(`Invalid conversion ratio: ${conversionRatio}. Must be > 0`);
  }
  return quantityLarge * conversionRatio;
}

/**
 * Convert from small unit to large unit (ALWAYS round UP)
 * VD: 83 lọ ÷ 100 lọ/túi = 0.83 → ROUND UP → 1 túi
 */
export function convertSmallToLarge(
  quantitySmall: number,
  conversionRatio: number
): number {
  if (conversionRatio <= 0) {
    throw new Error(`Invalid conversion ratio: ${conversionRatio}. Must be > 0`);
  }
  return Math.ceil(quantitySmall / conversionRatio);
}

/**
 * Calculate shortage (always non-negative)
 * Thiếu hụt = MAX(0, Nhu cầu - Tồn kho)
 */
export function calculateShortage(
  required: number,
  stock: number
): number {
  return Math.max(0, required - stock);
}

/**
 * Check if stock is sufficient
 */
export function isSufficientStock(
  required: number,
  stock: number
): boolean {
  return stock >= required;
}

/**
 * Round up (ceiling function)
 * Always round UP for purchase quantities
 */
export function roundUp(value: number): number {
  return Math.ceil(value);
}

/**
 * Safe number conversion
 * Convert value to number, handle text and errors
 */
export function toNumber(value: any, defaultValue: number = 0): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    // Extract number from text like "100 lọ"
    const match = value.match(/\d+(\.\d+)?/);
    if (match) {
      const num = parseFloat(match[0]);
      return isNaN(num) ? defaultValue : num;
    }
  }

  return defaultValue;
}

/**
 * Ensure non-negative
 * If value < 0, convert to 0
 */
export function ensureNonNegative(value: number): number {
  return value < 0 ? 0 : value;
}

/**
 * Validate conversion ratio
 */
export function validateConversionRatio(
  ratio: number,
  productName: string
): void {
  if (ratio <= 0) {
    throw new Error(
      `Tỷ lệ quy đổi không hợp lệ cho '${productName}': ${ratio}. Tỷ lệ phải > 0`
    );
  }
}
