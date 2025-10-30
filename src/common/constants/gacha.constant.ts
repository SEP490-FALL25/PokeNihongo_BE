export const GachaStarType = {
  ONE: 'ONE',
  TWO: 'TWO',
  THREE: 'THREE',
  FOUR: 'FOUR',
  FIVE: 'FIVE'
} as const

export type GachaStarTypeType = (typeof GachaStarType)[keyof typeof GachaStarType]

export const GachaPityType = {
  PENDING: 'PENDING',
  COMPLETED_MAX: 'COMPLETED_MAX',
  COMPLETED_LUCK: 'COMPLETED_LUCK'
} as const
export type GachaPityTypeType = (typeof GachaPityType)[keyof typeof GachaPityType]
