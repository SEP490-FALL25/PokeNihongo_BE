export const walletType = {
  COIN: 'COIN',
  FREE_COIN: 'FREE_COIN'
} as const

export type WalletTypeType = (typeof walletType)[keyof typeof walletType]

export const walletTransactionType = {
  INCREASE: 'INCREASE',
  DECREASE: 'DECREASE'
} as const

export type walletTransactionType =
  (typeof walletTransactionType)[keyof typeof walletTransactionType]

export type WalletTransactionTypeType = walletTransactionType
