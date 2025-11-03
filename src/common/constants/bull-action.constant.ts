export const BullAction = {
  // Match participant actions
  CHECK_ACCEPTANCE_TIMEOUT: 'check-acceptance-timeout',

  // User actions
  DELETE_INACTIVE_USER: 'delete-inactive-user'
} as const

export const BullQueue = {
  MATCH_PARTICIPANT_TIMEOUT: 'match-participant-timeout',
  USER_DELETION: 'user-deletion'
} as const
