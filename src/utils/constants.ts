// Application constants
export const APP_NAME = 'Electrician Invoice Generator'
export const APP_VERSION = '1.0.0'

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_USER: 'electrician_app_auth_user',
  COMPANY_PROFILE: 'electrician_app_company_profile',
  CUSTOMERS: 'electrician_app_customers',
  INVOICES: 'electrician_app_invoices',
  SETTINGS: 'electrician_app_settings',
} as const

// Invoice statuses
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
} as const

// Line item types
export const LINE_ITEM_TYPE = {
  MATERIAL: 'material',
  LABOR: 'labor',
} as const

// Default values
export const DEFAULTS = {
  LABOR_RATE: 75.0,
  TAX_RATE: 0.08,
  CURRENCY: 'USD',
  INVOICE_NUMBER_PREFIX: 'INV',
} as const

// Validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/,
  ZIP_CODE: /^\d{5}(-\d{4})?$/,
} as const

// UI constants
export const UI = {
  SIDEBAR_WIDTH: 256,
  HEADER_HEIGHT: 64,
  MOBILE_BREAKPOINT: 768,
} as const
