export const LEVEL_TYPE = {
  USER: 'USER'
} as const

export type LevelTypeType = (typeof LEVEL_TYPE)[keyof typeof LEVEL_TYPE]
