import { NotificationType } from '@/common/constants/notification.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base Notification Schema
export const NotificationSchema = z.object({
  id: z.number(),
  userId: z.number(),
  titleKey: z.string(),
  bodyKey: z.string(),
  type: z
    .enum([
      NotificationType.REWARD,
      NotificationType.LESSON,
      NotificationType.EXERCISE,
      NotificationType.ACHIEVEMENT,
      NotificationType.SEASON,
      NotificationType.LEVEL,
      NotificationType.SYSTEM,
      NotificationType.OTHER
    ])
    .default(NotificationType.OTHER),
  isRead: z.boolean().default(false),
  data: z.any().nullable(),

  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateNotificationBodySchema = NotificationSchema.pick({
  userId: true,
  titleKey: true,
  bodyKey: true,
  data: true,
  type: true
})

  .strict()

export const CreateNotificationResSchema = z.object({
  statusCode: z.number(),
  data: NotificationSchema,
  message: z.string()
})

// Update Schema
export const UpdateNotificationBodySchema = NotificationSchema.pick({
  titleKey: true,
  bodyKey: true,
  data: true,
  isRead: true
})
  .partial()
  .strict()

export const UpdateNotificationResSchema = CreateNotificationResSchema

// Query Schema
export const GetNotificationParamsSchema = z.object({
  notificationId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetRewardByLeaderboardParamsSchema = z.object({
  leaderboardSeasonId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetNotificationDetailSchema = NotificationSchema

export const GetNotificationDetailResSchema = z.object({
  statusCode: z.number(),
  data: GetNotificationDetailSchema,
  message: z.string()
})

// Type exports
export type NotificationType = z.infer<typeof NotificationSchema>
export type CreateNotificationBodyType = z.infer<typeof CreateNotificationBodySchema>
export type UpdateNotificationBodyType = z.infer<typeof UpdateNotificationBodySchema>
export type GetNotificationParamsType = z.infer<typeof GetNotificationParamsSchema>

// Field for query
export type NotificationFieldType = keyof z.infer<typeof NotificationSchema>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  NotificationSchema.shape
) as NotificationFieldType[]
