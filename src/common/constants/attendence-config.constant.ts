export const WeekDay = {
  SUNDAY: 'SUNDAY',
  MONDAY: 'MONDAY',
  TUESDAY: 'TUESDAY',
  WEDNESDAY: 'WEDNESDAY',
  THURSDAY: 'THURSDAY',
  FRIDAY: 'FRIDAY',
  SATURDAY: 'SATURDAY'
} as const

export type WeekDayType = (typeof WeekDay)[keyof typeof WeekDay]
