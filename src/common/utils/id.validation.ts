import { z } from 'zod'

export const checkIdSchema = (message: string) =>
  z.coerce
    .number({
      invalid_type_error: message,
      required_error: message
    })
    .int({ message })
    .positive({ message })
