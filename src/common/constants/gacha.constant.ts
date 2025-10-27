export const GachaStarType = {
  ONE: 'ONE',
  TWO: 'TWO',
  THREE: 'THREE',
  FOUR: 'FOUR',
  FIVE: 'FIVE'
} as const

export type GachaStarType = (typeof GachaStarType)[keyof typeof GachaStarType]
