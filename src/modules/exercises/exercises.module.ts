import { Module } from '@nestjs/common'
import { ExercisesController } from './exercises.controller'
import { ExercisesService } from './exercises.service'
import { ExercisesRepository } from './exercises.repo'
import { SharedModule } from '@/shared/shared.module'

@Module({
    imports: [SharedModule],
    controllers: [ExercisesController],
    providers: [ExercisesService, ExercisesRepository],
    exports: [ExercisesService, ExercisesRepository],
})
export class ExercisesModule { }
