import { Module } from '@nestjs/common'
import { UserExerciseAttemptController } from './user-exercise-attempt.controller'
import { UserExerciseAttemptRepository } from './user-exercise-attempt.repo'
import { UserExerciseAttemptService } from './user-exercise-attempt.service'

@Module({
    imports: [],
    controllers: [UserExerciseAttemptController],
    providers: [UserExerciseAttemptService, UserExerciseAttemptRepository],
    exports: [UserExerciseAttemptService, UserExerciseAttemptRepository]
})
export class UserExerciseAttemptModule { }


