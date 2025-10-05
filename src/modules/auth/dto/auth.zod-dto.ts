import {
  AccountResSchema,
  ChangePasswordBodySchema,
  ForgotPasswordBodySchema,
  GetAccountProfileResSchema,
  GetAuthorizationUrlResSchema,
  LoginBodySchema,
  LoginResSchema,
  LogoutBodySchema,
  RefreshTokenBodySchema,
  RefreshTokenResSchema,
  RegisterBodySchema,
  RegisterResSchema,
  ResetPasswordBodySchema,
  SendOTPBodySchema,
  UpdateMeBodySchema,
  VerifyEmailBodySchema,
  verifyForgotPasswordBodySchema,
  verifyForgotPasswordResSchema,
  VerifyOTPBodySchema,
  VerifyOTPResSchema
} from '@/modules/auth/entities/auth.entities'
import { createZodDto } from 'nestjs-zod'

export class RegisterBodyDTO extends createZodDto(RegisterBodySchema) {}

export class RegisterResDTO extends createZodDto(RegisterResSchema) {}

export class SendOTPBodyDTO extends createZodDto(SendOTPBodySchema) {}

export class LoginBodyDTO extends createZodDto(LoginBodySchema) {}

export class LoginResDTO extends createZodDto(LoginResSchema) {}

export class RefreshTokenBodyDTO extends createZodDto(RefreshTokenBodySchema) {}

export class RefreshTokenResDTO extends createZodDto(RefreshTokenResSchema) {}

export class LogoutBodyDTO extends createZodDto(LogoutBodySchema) {}

export class GetAuthorizationUrlResDTO extends createZodDto(
  GetAuthorizationUrlResSchema
) {}

export class ForgotPasswordBodyDTO extends createZodDto(ForgotPasswordBodySchema) {}

export class ChangePasswordBodyDTO extends createZodDto(ChangePasswordBodySchema) {}

export class verifyForgotPasswordBodyDTO extends createZodDto(
  verifyForgotPasswordBodySchema
) {}
export class verifyForgotPasswordResDTO extends createZodDto(
  verifyForgotPasswordResSchema
) {}
export class ResetPasswordBodyDTO extends createZodDto(ResetPasswordBodySchema) {}
export class UpdateMeBodyDTO extends createZodDto(UpdateMeBodySchema) {}
export class AccountResDTO extends createZodDto(AccountResSchema) {}
export class VerifyEmailBodyDTO extends createZodDto(VerifyEmailBodySchema) {}

export class VerifyOTPBodyDTO extends createZodDto(VerifyOTPBodySchema) {}
export class VerifyOTPResDTO extends createZodDto(VerifyOTPResSchema) {}

export class GetAccountProfileResDTO extends createZodDto(GetAccountProfileResSchema) {}
