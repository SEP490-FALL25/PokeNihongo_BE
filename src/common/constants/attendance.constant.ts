export const AttendancesStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT'
} as const

export type AttendancesStatusType =
  (typeof AttendancesStatus)[keyof typeof AttendancesStatus]
