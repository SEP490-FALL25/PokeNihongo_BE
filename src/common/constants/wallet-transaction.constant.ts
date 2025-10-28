export const walletPurposeType = {
  SUBSCRIPTION: 'SUBSCRIPTION',
  GACHA: 'GACHA',
  SHOP: 'SHOP',
  DAILY_REQUEST: 'DAILY_REQUEST',
  REWARD: 'REWARD',
  REFUND: 'REFUND'
} as const

export type WalletPurposeTypeType =
  (typeof walletPurposeType)[keyof typeof walletPurposeType]

export const WalletTransactionType = {
  INCREASE: 'INCREASE',
  DECREASE: 'DECREASE'
} as const

export type WalletTransactionTypeType =
  (typeof WalletTransactionType)[keyof typeof WalletTransactionType]

export const WalletTransactionSourceType = {
  DAILY_CHECKIN: 'DAILY_CHECKIN',
  EVENT_REWARD: 'EVENT_REWARD',
  RANK_REWARD: 'RANK_REWARD',
  LESSON_PURCHASE: 'LESSON_PURCHASE',
  SHOP_PURCHASE: 'SHOP_PURCHASE',
  SUBSCRIPTION_DISCOUNT: 'SUBSCRIPTION_DISCOUNT',
  ADMIN_ADJUST: 'ADMIN_ADJUST'
} as const

export type WalletTransactionSourceTypeType =
  (typeof WalletTransactionSourceType)[keyof typeof WalletTransactionSourceType]

export const TransactionPurposeType = {
  SUBSCRIPTION: 'SUBSCRIPTION',
  GACHA: 'GACHA',
  SHOP: 'SHOP',
  QUIZ_ATTEMPT: 'QUIZ_ATTEMPT',
  REWARD: 'REWARD',
  REFUND: 'REFUND'
} as const

export type TransactionPurposeTypeType =
  (typeof TransactionPurposeType)[keyof typeof TransactionPurposeType]
