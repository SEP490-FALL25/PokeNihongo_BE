export const BullAction = {
  // Match participant actions
  CHECK_ACCEPTANCE_TIMEOUT: 'check-acceptance-timeout',

  // Match round participant actions
  CHECK_POKEMON_SELECTION_TIMEOUT: 'check-pokemon-selection-timeout',

  // User actions
  DELETE_INACTIVE_USER: 'delete-inactive-user'
} as const

export const BullQueue = {
  MATCH_PARTICIPANT_TIMEOUT: 'match-participant-timeout',
  MATCH_ROUND_PARTICIPANT_TIMEOUT: 'match-round-participant-timeout',
  USER_DELETION: 'user-deletion'
} as const
