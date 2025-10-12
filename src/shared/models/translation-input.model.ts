import { z } from 'zod'

export const TranslationInputSchema = z.array(
  z.object({
    key: z.string().min(1),
    value: z.string().min(1)
  })
)
