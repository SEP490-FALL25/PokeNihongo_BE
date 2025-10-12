import { Module } from '@nestjs/common'
import { ExercisesController } from './exercises.controller'
import { ExercisesService } from './exercises.service'
import { ExercisesRepository } from './exercises.repo'
import { SharedModule } from '@/shared/shared.module'
import { TranslationModule } from '@/modules/translation/translation.module'
import { LanguagesModule } from '@/modules/languages/languages.module'
import { UploadModule } from '@/3rdService/upload/upload.module'

@Module({
    imports: [SharedModule, TranslationModule, LanguagesModule, UploadModule],
    controllers: [ExercisesController],
    providers: [ExercisesService, ExercisesRepository],
    exports: [ExercisesService, ExercisesRepository],
})
export class ExercisesModule { }
