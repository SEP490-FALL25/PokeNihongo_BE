export const ShopBannerStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  EXPIRED: 'EXPIRED',
  PREVIEW: 'PREVIEW'
} as const
export type ShopBannerStatusType = keyof typeof ShopBannerStatus
