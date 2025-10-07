import { Injectable, Logger } from '@nestjs/common'
import {
    CreateExercisesBodyType,
    UpdateExercisesBodyType,
    GetExercisesByIdParamsType,
    GetExercisesListQueryType,
} from './entities/exercises.entities'
import {
    ExercisesNotFoundException,
    ExercisesAlreadyExistsException,
    InvalidExercisesDataException,
    LessonNotFoundException,
} from './dto/exercises.error'
import { ExercisesRepository } from './exercises.repo'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'

@Injectable()
export class ExercisesService {
    private readonly logger = new Logger(ExercisesService.name)

    constructor(
        private readonly exercisesRepository: ExercisesRepository
    ) { }

    //#region Get Exercises
    async getExercisesList(params: GetExercisesListQueryType) {
        try {
            this.logger.log('Getting exercises list with params:', params)

            const result = await this.exercisesRepository.findMany(params)

            this.logger.log(`Found ${result.data.length} exercises entries`)
            return {
                statusCode: 200,
                message: 'Lấy danh sách bài tập thành công',
                data: {
                    results: result.data,
                    pagination: {
                        current: result.page,
                        pageSize: result.limit,
                        totalPage: result.totalPages,
                        totalItem: result.total
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error getting exercises list:', error)
            throw error
        }
    }

    async getExercisesById(params: GetExercisesByIdParamsType) {
        try {
            this.logger.log(`Getting exercises by id: ${params.id}`)

            const exercises = await this.exercisesRepository.findById(params.id)

            if (!exercises) {
                throw new ExercisesNotFoundException()
            }

            this.logger.log(`Found exercises: ${exercises.id}`)
            return {
                data: exercises,
                message: 'Lấy thông tin bài tập thành công'
            }
        } catch (error) {
            this.logger.error(`Error getting exercises by id ${params.id}:`, error)

            if (error instanceof ExercisesNotFoundException) {
                throw error
            }

            throw new InvalidExercisesDataException('Lỗi khi lấy thông tin bài tập')
        }
    }
    //#endregion

    //#region Create Exercises
    async createExercises(data: CreateExercisesBodyType) {
        try {
            this.logger.log('Creating exercises with data:', data)

            // Check if lesson exists
            const lessonExists = await this.exercisesRepository.checkLessonExists(data.lessonId)
            if (!lessonExists) {
                throw new LessonNotFoundException()
            }

            // Create exercises first with temporary titleKey
            const tempData = { ...data, titleKey: 'temp' }
            const exercises = await this.exercisesRepository.create(tempData)

            // Generate titleKey with actual ID
            const titleKey = `exercise.${exercises.id}.title`

            // Update with correct titleKey
            const updatedExercises = await this.exercisesRepository.update(exercises.id, { titleKey })

            this.logger.log(`Created exercises: ${updatedExercises.id}`)
            return {
                data: updatedExercises,
                message: 'Tạo bài tập thành công'
            }
        } catch (error) {
            this.logger.error('Error creating exercises:', error)

            if (error instanceof LessonNotFoundException || error instanceof ExercisesAlreadyExistsException) {
                throw error
            }

            if (isUniqueConstraintPrismaError(error)) {
                throw new ExercisesAlreadyExistsException()
            }

            throw new InvalidExercisesDataException('Lỗi khi tạo bài tập')
        }
    }
    //#endregion

    //#region Update Exercises
    async updateExercises(id: number, data: UpdateExercisesBodyType) {
        try {
            this.logger.log(`Updating exercises ${id} with data:`, data)

            // Check if exercises exists
            const exercises = await this.exercisesRepository.findById(id)
            if (!exercises) {
                throw new ExercisesNotFoundException()
            }

            // Check if lesson exists (if updating lessonId)
            if (data.lessonId) {
                const lessonExists = await this.exercisesRepository.checkLessonExists(data.lessonId)
                if (!lessonExists) {
                    throw new LessonNotFoundException()
                }
            }

            // Update exercises first
            const updatedExercises = await this.exercisesRepository.update(id, data)

            // Generate new titleKey if titleJp or exerciseType changed
            if (data.titleJp || data.exerciseType) {
                const newExerciseType = data.exerciseType || exercises.exerciseType
                const newTitleKey = `exercise.${id}.${newExerciseType}.title`

                // Update with new titleKey
                const finalUpdatedExercises = await this.exercisesRepository.update(id, { titleKey: newTitleKey })
                return {
                    data: finalUpdatedExercises,
                    message: 'Cập nhật bài tập thành công'
                }
            }

            this.logger.log(`Updated exercises: ${updatedExercises.id}`)
            return {
                data: updatedExercises,
                message: 'Cập nhật bài tập thành công'
            }
        } catch (error) {
            this.logger.error(`Error updating exercises ${id}:`, error)

            if (error instanceof ExercisesNotFoundException ||
                error instanceof LessonNotFoundException ||
                error instanceof ExercisesAlreadyExistsException) {
                throw error
            }

            throw new InvalidExercisesDataException('Lỗi khi cập nhật bài tập')
        }
    }
    //#endregion

    //#region Delete Exercises
    async deleteExercises(id: number) {
        try {
            this.logger.log(`Deleting exercises ${id}`)

            // Check if exercises exists
            const exercises = await this.exercisesRepository.findById(id)
            if (!exercises) {
                throw new ExercisesNotFoundException()
            }

            await this.exercisesRepository.delete(id)

            this.logger.log(`Deleted exercises ${id}`)
            return {
                message: 'Xóa bài tập thành công'
            }
        } catch (error) {
            this.logger.error(`Error deleting exercises ${id}:`, error)

            if (error instanceof ExercisesNotFoundException) {
                throw error
            }

            if (isNotFoundPrismaError(error)) {
                throw new ExercisesNotFoundException()
            }

            throw new InvalidExercisesDataException('Lỗi khi xóa bài tập')
        }
    }
    //#endregion
}
