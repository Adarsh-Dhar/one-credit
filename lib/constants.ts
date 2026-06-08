// lib/constants.ts
//
// Shared constants to avoid magic numbers across the codebase

export const MONGODB_CONFIG = {
  MAX_POOL_SIZE: 10,
  SERVER_SELECTION_TIMEOUT_MS: 5000,
  SOCKET_TIMEOUT_MS: 45000,
} as const;

export const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS: 10,
  WINDOW_DURATION: '1 m',
} as const;

export const DEFAULT_FINANCIALS = {
  GST_RATE: 0.18,
  RISK_FREE_RATE_PERCENT: 7,
  BILLING_CYCLE_DAYS: 30,
} as const;
