import { Module } from '@nestjs/common'
import { UserExerciseAttemptController } from './user-exercise-attempt.controller'
import { UserExerciseAttemptRepository } from './user-exercise-attempt.repo'
import { UserExerciseAttemptService } from './user-exercise-attempt.service'
import { QuestionModule } from '../question/question.module'
import { UserAnswerLogModule } from '../user-answer-log/user-answer-log.module'
import { UserProgressModule } from '../user-progress/user-progress.module'
import { ExercisesModule } from '../exercises/exercises.module'

@Module({
    imports: [QuestionModule, UserAnswerLogModule, UserProgressModule, ExercisesModule],
    controllers: [UserExerciseAttemptController],
    providers: [UserExerciseAttemptService, UserExerciseAttemptRepository],
    exports: [UserExerciseAttemptService, UserExerciseAttemptRepository]
})
export class UserExerciseAttemptModule { }


