import { z } from 'zod'

export const TranslationInputSchema = z.array(
  z.object({
    key: z.string(),
    value: z.string()
  })
)
