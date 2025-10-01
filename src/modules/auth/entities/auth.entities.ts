import { TypeOfVerificationCode } from '@/common/constants/auth.constant'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { RoleSchema } from 'src/shared/models/shared-role.model'
import { UserSchema } from 'src/shared/models/shared-user.model'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const DeviceSchema = z.object({
  id: z.number(),
  userId: z.number(),
  userAgent: z.string(),
  deviceToken: z.string(), // UUID để định danh thiết bị
  ip: z.string(),
  lastActive: z.date(),
  createdAt: z.date(),
  isActive: z.boolean()
})

export const VerificationCodeSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  code: z.string().length(6),
  type: z.enum([
    TypeOfVerificationCode.REGISTER,
    TypeOfVerificationCode.FORGOT_PASSWORD,
    TypeOfVerificationCode.LOGIN
  ]),
  expiresAt: z.date(),
  createdAt: z.date()
})

export const SendOTPBodySchema = VerificationCodeSchema.pick({
  email: true,
  type: true
}).strict()

export const VerifyOTPBodySchema = VerificationCodeSchema.pick({
  email: true,
  code: true,
  type: true
}).strict()

export const VerifyOTPResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      message: z.string()
    }),
    message: z.string()
  })
  .strict()

export const LoginBodySchema = UserSchema.pick({
  email: true,
  password: true
}).strict()

export const LoginResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      ...UserSchema.pick({
        id: true,
        name: true,
        email: true,
        status: true,
        phoneNumber: true,
        roleId: true,
        avatar: true
      }).shape,
      role: RoleSchema,
      device: z.object({
        ...DeviceSchema.pick({
          id: true,
          deviceToken: true
        }).shape
      })
    }),

    message: z.string()
  })
  .strict()

export const RegisterBodySchema = UserSchema.pick({
  name: true,
  email: true,
  password: true,
  phoneNumber: true
})
  // .extend({
  //   confirmPassword: z.string().min(6).max(100)
  //   // code: z.string().length(6)
  // })
  .strict()
// .superRefine(({ confirmPassword, password }, ctx) => {
//   if (confirmPassword !== password) {
//     ctx.addIssue({
//       code: 'custom',
//       message: 'Password and confirm password must match',
//       path: ['confirmPassword']
//     })
//   }
// })

export const RegisterResSchema = LoginResSchema

export const RefreshTokenBodySchema = z
  .object({
    refreshToken: z.string()
  })
  .strict()

export const RefreshTokenResSchema = LoginResSchema

export const RefreshTokenSchema = z.object({
  token: z.string(),
  userId: z.number(),
  deviceId: z.number(),
  expiresAt: z.date(),
  createdAt: z.date()
})

export const LogoutBodySchema = RefreshTokenBodySchema

export const GoogleAuthStateSchema = DeviceSchema.pick({
  userAgent: true,
  ip: true
})

export const GetAuthorizationUrlResSchema = z.object({
  statusCode: z.number(),
  data: z.object({
    url: z.string().url()
  }),
  message: z.string()
})

export const ForgotPasswordBodySchema = z
  .object({
    email: z.string().email()
  })
  .strict()

export const verifyForgotPasswordBodySchema = z
  .object({
    email: z.string().email(),
    code: z.string().length(6)
  })
  .strict()

export const verifyForgotPasswordResSchema = z
  .object({
    data: z.object({
      accessToken: z.string()
    }),
    message: z.string(),
    statusCode: z.number()
  })
  .strict()

export const ResetPasswordBodySchema = z
  .object({
    // code: z.string().length(6),
    email: z.string().email(),
    newPassword: z.string().min(6).max(100),
    confirmNewPassword: z.string().min(6).max(100)
  })
  .strict()
  .superRefine(({ confirmNewPassword, newPassword }, ctx) => {
    if (confirmNewPassword !== newPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Mật khẩu mới và mật khẩu xác nhận phải giống nhau',
        path: ['confirmNewPassword']
      })
    }
  })

export const ChangePasswordBodySchema = z
  .object({
    password: z.string().min(6).max(100),
    newPassword: z.string().min(6).max(100),
    confirmNewPassword: z.string().min(6).max(100)
  })
  .strict()
  .superRefine(({ confirmNewPassword, newPassword }, ctx) => {
    if (confirmNewPassword !== newPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Mật khẩu mới và mật khẩu xác nhận phải giống nhau',
        path: ['confirmNewPassword']
      })
    }
  })

export const UpdateMeBodySchema = z
  .object({
    name: z.string().trim().min(2).max(256),
    phoneNumber: z.string().min(9).max(15),
    avatar: z.string().url().optional()
  })
  .strict()

export const AccountResSchema = z.object({
  data: UserSchema.omit({ password: true }),
  message: z.string()
})

export const VerifyEmailBodySchema = UserSchema.pick({
  email: true
}).strict()

//type
export type VerifyEmailBodyType = z.infer<typeof VerifyEmailBodySchema>
export type RegisterBodyType = z.infer<typeof RegisterBodySchema>
export type RegisterResType = z.infer<typeof RegisterResSchema>
export type VerificationCodeType = z.infer<typeof VerificationCodeSchema>
export type SendOTPBodyType = z.infer<typeof SendOTPBodySchema>
export type LoginBodyType = z.infer<typeof LoginBodySchema>
export type LoginResType = z.infer<typeof LoginResSchema>
export type RefreshTokenType = z.infer<typeof RefreshTokenSchema>
export type RefreshTokenBodyType = z.infer<typeof RefreshTokenBodySchema>
export type RefreshTokenResType = LoginResType
export type DeviceType = z.infer<typeof DeviceSchema>
export type LogoutBodyType = RefreshTokenBodyType
export type GoogleAuthStateType = z.infer<typeof GoogleAuthStateSchema>
export type GetAuthorizationUrlResType = z.infer<typeof GetAuthorizationUrlResSchema>
export type ForgotPasswordBodyType = z.infer<typeof ForgotPasswordBodySchema>
export type verifyForgotPasswordBodyType = z.infer<typeof verifyForgotPasswordBodySchema>
export type verifyForgotPasswordResType = z.infer<typeof verifyForgotPasswordResSchema>
export type ResetPasswordBodyType = z.infer<typeof ResetPasswordBodySchema>
export type ChangePasswordBodyType = z.infer<typeof ChangePasswordBodySchema>
export type UpdateMeBodyType = z.infer<typeof UpdateMeBodySchema>
export type AccountResType = z.infer<typeof AccountResSchema>

export type VerifyOTPBodyType = z.infer<typeof VerifyOTPBodySchema>
