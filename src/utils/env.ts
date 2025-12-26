// Environment configuration
export const ENV = {
  NODE_ENV: import.meta.env.NODE_ENV || 'development',
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  BASE_URL: import.meta.env.BASE_URL || '/',
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
} as const

// Feature flags
export const FEATURES = {
  ENABLE_ANALYTICS: ENV.PROD,
  ENABLE_DEBUG_LOGS: ENV.DEV,
  ENABLE_MOCK_DATA: ENV.DEV,
} as const

// Configuration based on environment
export const CONFIG = {
  API_TIMEOUT: ENV.PROD ? 10000 : 5000,
  STORAGE_PREFIX: ENV.PROD ? 'electrician_app_' : 'electrician_app_dev_',
  LOG_LEVEL: ENV.DEV ? 'debug' : 'error',
} as const
