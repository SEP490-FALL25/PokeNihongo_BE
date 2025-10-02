import CustomZodValidationPipe from '@/common/pipes/custom-zod-validation.pipe'
import { HttpExceptionFilter } from '@/shared/filters/http-exception.filter'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ZodSerializerInterceptor } from 'nestjs-zod'
import { MailModule } from './3rdService/mail/mail.module'
import { UploadModule } from './3rdService/upload/upload.module'
import { SpeechModule } from './3rdService/speech/speech.module'
import { TransformInterceptor } from './common/interceptor/transform.interceptor'
import { AuthModule } from './modules/auth/auth.module'
import { PermissionModule } from './modules/permission/permission.module'
import { RoleModule } from './modules/role/role.module'
import { VocabularyModule } from './modules/vocabulary/vocabulary.module'
import { SharedModule } from './shared/shared.module'
import { RewardModule } from './modules/reward/reward.module';
import { LevelModule } from './modules/level/level.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true // Cho phép dùng process.env ở mọi nơi
    }),
    ScheduleModule.forRoot(),

    MailModule,
    UploadModule,
    SpeechModule,
    SharedModule,
    AuthModule,
    RoleModule,
    PermissionModule,
    VocabularyModule,
    RewardModule,
    LevelModule
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
      useClass: HttpExceptionFilter
    }
  ]
})
export class AppModule { }
