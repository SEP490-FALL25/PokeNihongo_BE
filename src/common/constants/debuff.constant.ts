export const MatchDebuffType = {
  ADD_QUESTION: 'ADD_QUESTION',
  DECREASE_POINT: 'DECREASE_POINT',
  DISCOMFORT_VISION: 'DISCOMFORT_VISION'
} as const

export type MatchDebuffType = (typeof MatchDebuffType)[keyof typeof MatchDebuffType]
