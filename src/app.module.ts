import { I18nHttpExceptionFilter } from '@/common/filters/i18n-http-exception.filter'
import { RequestContextMiddleware } from '@/common/middleware/request-context.middleware'
import CustomZodValidationPipe from '@/common/pipes/custom-zod-validation.pipe'
import { I18nModule } from '@/i18n/i18n.module'
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ZodSerializerInterceptor } from 'nestjs-zod'
import { MailModule } from './3rdService/mail/mail.module'
import { SpeechModule } from './3rdService/speech/speech.module'
import { UploadModule } from './3rdService/upload/upload.module'
import { TransformInterceptor } from './common/interceptor/transform.interceptor'
import { AuthModule } from './modules/auth/auth.module'
import { PermissionModule } from './modules/permission/permission.module'
import { RoleModule } from './modules/role/role.module'
import { TranslationModule } from './modules/translation/translation.module'
import { VocabularyModule } from './modules/vocabulary/vocabulary.module'

import { AchievementGroupModule } from './modules/achievement-group/achievement-group.module'
import { AchievementModule } from './modules/achievement/achievement.module'
import { AnswerModule } from './modules/answer/answer.module'
import { AttendanceModule } from './modules/attendance/attendance.module'
import { AttendenceConfigModule } from './modules/attendence-config/attendence-config.module'
import { DailyRequestModule } from './modules/daily-request/daily-request.module'
import { ElementalTypeModule } from './modules/elemental-type/elemental-type.module'
import { ExercisesModule } from './modules/exercises/exercises.module'
import { GrammarUsageModule } from './modules/grammar-usage/grammar-usage.module'
import { GrammarModule } from './modules/grammar/grammar.module'
import { KanjiModule } from './modules/kanji/kanji.module'
import { LanguagesModule } from './modules/languages/languages.module'
import { LessonCategoryModule } from './modules/lesson-category/lesson-category.module'
import { LessonContentModule } from './modules/lesson-content/lesson-content.module'
import { LessonModule } from './modules/lesson/lesson.module'
import { LevelModule } from './modules/level/level.module'
import { MeaningModule } from './modules/meaning/meaning.module'
import { PokemonModule } from './modules/pokemon/pokemon.module'

import { QuestionBankModule } from './modules/question-bank/question-bank.module'
import { RewardModule } from './modules/reward/reward.module'
import { SpeakingModule } from './modules/speaking/speaking.module'
import { TestSetQuestionBankModule } from './modules/testset-questionbank/testset-questionbank.module'
import { TestSetModule } from './modules/testset/testset.module'
import { TypeEffectivenessModule } from './modules/type-effectiveness/type-effectiveness.module'
import { UserAnswerLogModule } from './modules/user-answer-log/user-answer-log.module'
import { UserDailyRequestModule } from './modules/user-daily-request/user-daily-request.module'
import { UserExerciseAttemptModule } from './modules/user-exercise-attempt/user-exercise-attempt.module'
import { UserPokemonModule } from './modules/user-pokemon/user-pokemon.module'
import { UserProgressModule } from './modules/user-progress/user-progress.module'
import { UserModule } from './modules/user/user.module'
import { WalletModule } from './modules/wallet/wallet.module'
import { WordTypeModule } from './modules/wordtype/wordtype.module'
import { SharedModule } from './shared/shared.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true // Cho phép dùng process.env ở mọi nơi
    }),
    ScheduleModule.forRoot(),
    I18nModule, // Add I18n module

    MailModule,
    UploadModule,
    SpeechModule,
    SharedModule,
    AuthModule,
    RoleModule,
    PermissionModule,
    VocabularyModule,
    TranslationModule,
    KanjiModule,
    LanguagesModule,
    MeaningModule,
    WordTypeModule,
    RewardModule,
    LevelModule,
    ElementalTypeModule,
    TypeEffectivenessModule,
    PokemonModule,
    UserPokemonModule,
    LessonModule,
    LessonCategoryModule,
    LessonContentModule,
    GrammarModule,
    GrammarUsageModule,
    ExercisesModule,
    AnswerModule,
    UserModule,
    AchievementGroupModule,
    DailyRequestModule,
    UserDailyRequestModule,
    UserAnswerLogModule,
    QuestionBankModule,
    UserExerciseAttemptModule,
    UserProgressModule,
    AchievementGroupModule,
    AchievementModule,
    AttendenceConfigModule,
    AttendanceModule,
    TestSetModule,
    TestSetQuestionBankModule,
    SpeakingModule,
    WalletModule
  ],

  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useClass: CustomZodValidationPipe
    },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    {
      provide: APP_FILTER,
      useClass: I18nHttpExceptionFilter
    }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*')
  }
}
