export const GachaStarType = {
  ONE: 'ONE',
  TWO: 'TWO',
  THREE: 'THREE',
  FOUR: 'FOUR',
  FIVE: 'FIVE'
} as const

export type GachaStarTypeType = (typeof GachaStarType)[keyof typeof GachaStarType]
