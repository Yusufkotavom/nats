export const UNIFIED_PAYMENT_METHODS = ["CASH", "BANK", "CARD", "QRIS"] as const;

export type UnifiedPaymentMethod = (typeof UNIFIED_PAYMENT_METHODS)[number];
