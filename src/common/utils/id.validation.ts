import { z } from 'zod'

export const checkIdSchema = (messageKey: string) =>
  z.coerce
    .number({
      invalid_type_error: messageKey,
      required_error: messageKey
    })
    .int({ message: messageKey })
    .positive({ message: messageKey })
