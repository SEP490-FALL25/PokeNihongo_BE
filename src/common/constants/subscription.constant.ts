export const TagNameSubscription = {
  NORMAL: 'NORMAL',
  COMBO: 'COMBO',
  ULTRA: 'ULTRA'
} as const
export type TagNameSubscriptionType =
  (typeof TagNameSubscription)[keyof typeof TagNameSubscription]

export const SubscriptionType = {
  LIFETIME: 'LIFETIME',
  RECURRING: 'RECURRING'
} as const

export type SubscriptionTypeType = keyof typeof SubscriptionType

export const FeatureKey = {
  UNLOCK_READING: 'UNLOCK_READING',
  UNLOCK_LISTENING: 'UNLOCK_LISTENING',
  XP_MULTIPLIER: 'XP_MULTIPLIER',
  COIN_MULTIPLIER: 'COIN_MULTIPLIER',
  UNLIMITED_TESTS: 'UNLIMITED_TESTS',
  PERSONALIZATION: 'PERSONALIZATION'
} as const
export type FeatureKeyType = keyof typeof FeatureKey

export const UserSubscriptionStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  ACTIVE: 'ACTIVE',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  CANCELED: 'CANCELED'
} as const

export type UserSubscriptionStatusType = keyof typeof UserSubscriptionStatus
