import { createZodDto } from 'nestjs-zod'
import {
    CreateUserTestAttemptBodySchema,
    UpdateUserTestAttemptBodySchema,
    GetUserTestAttemptByIdParamsSchema,
    CreateUserTestAttemptParamsSchema,
    GetUserTestAttemptListQuerySchema,
    UserTestAttemptResSchema,
    UserTestAttemptListResSchema,
    CheckTestCompletionBodySchema
} from '../entities/user-test-attempt.entities'

export class CreateUserTestAttemptBodyDTO extends createZodDto(CreateUserTestAttemptBodySchema) { }
export class UpdateUserTestAttemptBodyDTO extends createZodDto(UpdateUserTestAttemptBodySchema) { }
export class GetUserTestAttemptByIdParamsDTO extends createZodDto(GetUserTestAttemptByIdParamsSchema) { }
export class CreateUserTestAttemptParamsDTO extends createZodDto(CreateUserTestAttemptParamsSchema) { }
export class GetUserTestAttemptListQueryDTO extends createZodDto(GetUserTestAttemptListQuerySchema) { }
export class UserTestAttemptResDTO extends createZodDto(UserTestAttemptResSchema) { }
export class UserTestAttemptListResDTO extends createZodDto(UserTestAttemptListResSchema) { }
export class CheckTestCompletionBodyDTO extends createZodDto(CheckTestCompletionBodySchema) { }

