export const rankName = {
  N5: 'N5',
  N4: 'N4',
  N3: 'N3'
} as const

export type RankNameType = (typeof rankName)[keyof typeof rankName]
