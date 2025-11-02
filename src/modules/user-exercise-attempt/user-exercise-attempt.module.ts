import { Module } from '@nestjs/common'
import { UserExerciseAttemptController } from './user-exercise-attempt.controller'
import { UserExerciseAttemptRepository } from './user-exercise-attempt.repo'
import { UserExerciseAttemptService } from './user-exercise-attempt.service'
import { QuestionBankModule } from '../question-bank/question-bank.module'
import { UserAnswerLogModule } from '../user-answer-log/user-answer-log.module'
import { UserProgressModule } from '../user-progress/user-progress.module'
import { ExercisesModule } from '../exercises/exercises.module'
import { TranslationModule } from '../translation/translation.module'
import { UserModule } from '../user/user.module'
import { LevelModule } from '../level/level.module'

@Module({
    imports: [QuestionBankModule, UserAnswerLogModule, UserProgressModule, ExercisesModule, TranslationModule, UserModule, LevelModule],
    controllers: [UserExerciseAttemptController],
    providers: [UserExerciseAttemptService, UserExerciseAttemptRepository],
    exports: [UserExerciseAttemptService, UserExerciseAttemptRepository]
})
export class UserExerciseAttemptModule { }


