import { createZodDto } from 'nestjs-zod'
import {
    CreateUserExerciseAttemptBodySchema,
    UpdateUserExerciseAttemptBodySchema,
    GetUserExerciseAttemptByIdParamsSchema,
    GetUserExerciseAttemptListQuerySchema,
    UserExerciseAttemptResSchema,
    UserExerciseAttemptListResSchema
} from '../entities/user-exercise-attempt.entities'

export class CreateUserExerciseAttemptBodyDTO extends createZodDto(CreateUserExerciseAttemptBodySchema) { }
export class UpdateUserExerciseAttemptBodyDTO extends createZodDto(UpdateUserExerciseAttemptBodySchema) { }
export class GetUserExerciseAttemptByIdParamsDTO extends createZodDto(GetUserExerciseAttemptByIdParamsSchema) { }
export class GetUserExerciseAttemptListQueryDTO extends createZodDto(GetUserExerciseAttemptListQuerySchema) { }
export class UserExerciseAttemptResDTO extends createZodDto(UserExerciseAttemptResSchema) { }
export class UserExerciseAttemptListResDTO extends createZodDto(UserExerciseAttemptListResSchema) { }


