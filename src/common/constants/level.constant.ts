export const LEVEL_TYPE = {
  USER: 'USER',
  POKEMON: 'POKEMON'
} as const

export type LevelTypeType = (typeof LEVEL_TYPE)[keyof typeof LEVEL_TYPE]
