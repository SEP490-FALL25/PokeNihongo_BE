import { Injectable, Logger, HttpException, BadRequestException } from '@nestjs/common'
import { ExercisesRepository } from './exercises.repo'
import { CreateExercisesBodyType, UpdateExercisesBodyType, GetExercisesListQueryType, ExercisesType } from './entities/exercises.entities'
import { EXERCISES_MESSAGE } from '@/common/constants/message'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { ExercisesNotFoundException, InvalidExercisesDataException, LessonNotFoundException, ExercisesAlreadyExistsException } from './dto/exercises.error'

@Injectable()
export class ExercisesService {
    private readonly logger = new Logger(ExercisesService.name)

    constructor(private readonly exercisesRepository: ExercisesRepository) { }

    async create(data: CreateExercisesBodyType, userId: number): Promise<MessageResDTO> {
        try {
            this.logger.log(`Creating exercise: ${JSON.stringify(data)}`)

            // Check if lesson exists and get levelJlpt
            let lessonLevelJlpt: number | null = null
            if (data.lessonId) {
                const lessonExists = await this.exercisesRepository.checkLessonExists(data.lessonId)
                if (!lessonExists) {
                    throw LessonNotFoundException
                }
                // Get lesson levelJlpt for validation
                lessonLevelJlpt = await this.exercisesRepository.getLessonLevelJlpt(data.lessonId)
            }

            // Check if testSet exists and get levelN
            let testSetLevelN: number | null = null
            if (data.testSetId) {
                const testSetExists = await this.exercisesRepository.checkTestSetExists(data.testSetId)
                if (!testSetExists) {
                    throw InvalidExercisesDataException
                }
                // Get testSet levelN for validation
                testSetLevelN = await this.exercisesRepository.getTestSetLevelN(data.testSetId)
            }

            // Validate level compatibility: lesson levelJlpt must match testSet levelN
            if (lessonLevelJlpt !== null && testSetLevelN !== null) {
                if (lessonLevelJlpt !== testSetLevelN) {
                    throw new HttpException(
                        {
                            statusCode: 400,
                            message: `Level không tương thích: Lesson có level JLPT ${lessonLevelJlpt} nhưng TestSet có level ${testSetLevelN}. Chỉ có thể tạo Exercise khi level của Lesson và TestSet khớp nhau`,
                            error: 'LEVEL_INCOMPATIBLE'
                        },
                        400
                    )
                }
            }

            // Enforce per-lesson constraints: max 3 exercises and unique type per lesson
            if (data.lessonId) {
                const totalInLesson = await this.exercisesRepository.countByLesson(data.lessonId)
                if (totalInLesson >= 3) {
                    throw new HttpException(
                        {
                            statusCode: 400,
                            message: 'Mỗi bài học chỉ được phép có tối đa 3 bài tập: VOCABULARY, GRAMMAR, KANJI',
                            error: 'EXERCISE_LIMIT_PER_LESSON'
                        },
                        400
                    )
                }

                const existedSameType = await this.exercisesRepository.findByLessonAndType(data.lessonId, data.exerciseType as unknown as string)
                if (existedSameType) {
                    throw new HttpException(
                        {
                            statusCode: 409,
                            message: 'Mỗi loại bài tập chỉ được tạo 1 lần trong mỗi bài học',
                            error: 'EXERCISE_TYPE_ALREADY_EXISTS'
                        },
                        409
                    )
                }
            }

            // Validate testSet type matches exercise type when provided
            if (data.testSetId) {
                const testSetType = await this.exercisesRepository.getTestSetType(data.testSetId)
                if (testSetType && String(testSetType) !== String(data.exerciseType)) {
                    throw new HttpException(
                        {
                            statusCode: 400,
                            message: 'Loại TestSet không khớp với loại bài tập. Chỉ có thể gắn TestSet cùng loại (VOCABULARY/GRAMMAR/KANJI)',
                            error: 'TESTSET_TYPE_MISMATCH'
                        },
                        400
                    )
                }
            }

            const result = await this.exercisesRepository.create(data)
            this.logger.log(`Exercise created successfully with ID: ${result.id}`)

            return {
                statusCode: 201,
                data: result,
                message: EXERCISES_MESSAGE.CREATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error creating exercise:', error)
            if (error instanceof HttpException || error.message?.includes('đã tồn tại') || error.message?.includes('không tồn tại')) {
                throw error
            }
            // Handle Prisma unique constraint error
            if (error.code === 'P2002' && error.meta?.target?.includes('testSetId')) {
                throw new BadRequestException({
                    statusCode: 400,
                    message: 'TestSet này đã có exercise được gán. Mỗi testSet chỉ có thể có một exercise.',
                    error: 'TESTSET_ALREADY_HAS_EXERCISE'
                })
            }
            throw InvalidExercisesDataException
        }
    }

    async update(id: number, data: UpdateExercisesBodyType): Promise<MessageResDTO> {
        try {
            this.logger.log(`Updating exercise ${id} with data: ${JSON.stringify(data)}`)

            // Check if exercise exists
            const existingExercise = await this.exercisesRepository.findById(id)
            if (!existingExercise) {
                throw ExercisesNotFoundException
            }

            // Check if lesson exists (if updating lessonId)
            if (data.lessonId) {
                const lessonExists = await this.exercisesRepository.checkLessonExists(data.lessonId)
                if (!lessonExists) {
                    throw LessonNotFoundException
                }
            }

            // Check if testSet exists (if updating testSetId)
            if (data.testSetId) {
                const testSetExists = await this.exercisesRepository.checkTestSetExists(data.testSetId)
                if (!testSetExists) {
                    throw InvalidExercisesDataException
                }
            }

            // Compute target lesson and type for uniqueness checks
            const targetLessonId = data.lessonId ?? (existingExercise as any).lessonId
            const targetExerciseType = data.exerciseType ?? (existingExercise as any).exerciseType

            // Enforce unique type per lesson when changing type or lesson
            if (data.lessonId || data.exerciseType) {
                const existsSameType = await this.exercisesRepository.existsByLessonAndTypeExcludingId(
                    targetLessonId,
                    targetExerciseType as unknown as string,
                    id
                )
                if (existsSameType) {
                    throw new HttpException(
                        {
                            statusCode: 409,
                            message: 'Mỗi loại bài tập chỉ được tạo 1 lần trong mỗi bài học',
                            error: 'EXERCISE_TYPE_ALREADY_EXISTS'
                        },
                        409
                    )
                }
            }

            // Validate testSet type matches exercise type when updating testSetId or exerciseType
            if (data.testSetId || data.exerciseType) {
                const testSetIdToCheck = data.testSetId ?? (existingExercise as any).testSetId
                if (testSetIdToCheck) {
                    const testSetType = await this.exercisesRepository.getTestSetType(testSetIdToCheck)
                    const exerciseTypeToCheck = data.exerciseType ?? (existingExercise as any).exerciseType
                    if (testSetType && String(testSetType) !== String(exerciseTypeToCheck)) {
                        throw new HttpException(
                            {
                                statusCode: 400,
                                message: 'Loại TestSet không khớp với loại bài tập. Chỉ có thể gắn TestSet cùng loại (VOCABULARY/GRAMMAR/KANJI)',
                                error: 'TESTSET_TYPE_MISMATCH'
                            },
                            400
                        )
                    }
                }
            }

            const result = await this.exercisesRepository.update(id, data)
            this.logger.log(`Exercise updated successfully: ${result.id}`)

            return {
                statusCode: 200,
                data: result,
                message: EXERCISES_MESSAGE.UPDATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error updating exercise:', error)
            if (error instanceof HttpException || error.message?.includes('không tồn tại') || error.message?.includes('đã tồn tại')) {
                throw error
            }

            // Xử lý lỗi unique constraint violation cho testSetId
            if (error.code === 'P2002' && error.meta?.target?.includes('testSetId')) {
                throw new BadRequestException({
                    statusCode: 400,
                    message: 'TestSet này đã có exercise được gán. Mỗi testSet chỉ có thể có một exercise.',
                    error: 'TESTSET_ALREADY_HAS_EXERCISE'
                })
            }

            throw InvalidExercisesDataException
        }
    }

    async delete(id: number): Promise<MessageResDTO> {
        try {
            this.logger.log(`Deleting exercise: ${id}`)

            // Check if exercise exists
            const existingExercise = await this.exercisesRepository.findById(id)
            if (!existingExercise) {
                throw ExercisesNotFoundException
            }

            await this.exercisesRepository.delete(id)
            this.logger.log(`Exercise deleted successfully: ${id}`)

            return {
                statusCode: 200,
                data: null,
                message: EXERCISES_MESSAGE.DELETE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error deleting exercise:', error)
            if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
                throw error
            }
            throw InvalidExercisesDataException
        }
    }

    async findById(id: number): Promise<ExercisesType> {
        try {
            this.logger.log(`Getting exercise by ID: ${id}`)

            const repoResult = await this.exercisesRepository.findById(id)
            if (!repoResult) {
                throw ExercisesNotFoundException
            }

            this.logger.log(`Exercise found: ${repoResult.id}`)

            // Map to lean entity shape expected by ExercisesType
            const mapped: ExercisesType = {
                id: repoResult.id as any,
                createdAt: (repoResult as any).createdAt,
                updatedAt: (repoResult as any).updatedAt,
                lessonId: (repoResult as any).lessonId,
                exerciseType: (repoResult as any).exerciseType,
                isBlocked: (repoResult as any).isBlocked,
                testSetId: (repoResult as any).testSetId ?? null,
            }

            return mapped
        } catch (error) {
            this.logger.error('Error getting exercise by ID:', error)
            if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
                throw error
            }
            throw InvalidExercisesDataException
        }
    }

    async findByLessonId(lessonId: number): Promise<ExercisesType[]> {
        try {
            this.logger.log(`Getting exercises by lesson ID: ${lessonId}`)

            const result = await this.exercisesRepository.findByLessonId(lessonId)
            this.logger.log(`Found ${result.length} exercises for lesson ${lessonId}`)

            // Ensure exact type matching with ExercisesType
            const mapped = result.map((item: any) => ({
                id: item.id,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                lessonId: item.lessonId,
                exerciseType: item.exerciseType,
                isBlocked: item.isBlocked,
                testSetId: item.testSetId ?? null,
            })) as ExercisesType[]

            return mapped
        } catch (error) {
            this.logger.error('Error getting exercises by lesson ID:', error)
            if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
                throw error
            }
            throw InvalidExercisesDataException
        }
    }

    async getExercisesList(query: GetExercisesListQueryType): Promise<MessageResDTO> {
        try {
            this.logger.log(`Getting exercises list with query: ${JSON.stringify(query)}`)

            const result = await this.exercisesRepository.findMany(query)
            this.logger.log(`Found ${result.total} exercises`)

            const { currentPage, pageSize } = query
            const totalPage = Math.ceil(result.total / Number(pageSize))

            return {
                statusCode: 200,
                data: {
                    results: result.items,
                    pagination: {
                        current: Number(currentPage),
                        pageSize: Number(pageSize),
                        totalPage,
                        totalItem: result.total,
                    },
                },
                message: EXERCISES_MESSAGE.GET_LIST_SUCCESS,
            }
        } catch (error) {
            this.logger.error('Error getting exercises list:', error)
            if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
                throw error
            }
            throw InvalidExercisesDataException
        }
    }

    async getExercisesById(id: number): Promise<MessageResDTO> {
        try {
            this.logger.log(`Getting exercise by ID: ${id}`)

            const result = await this.exercisesRepository.findById(id)
            if (!result) {
                throw ExercisesNotFoundException
            }

            this.logger.log(`Exercise found: ${result.id}`)

            return {
                statusCode: 200,
                data: result,
                message: EXERCISES_MESSAGE.GET_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error getting exercise by ID:', error)
            if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
                throw error
            }
            throw InvalidExercisesDataException
        }
    }

    async getExercisesByIdHaveQuestionBanks(id: number): Promise<MessageResDTO> {
        try {
            this.logger.log(`Getting exercise by ID (plain): ${id}`)

            const result = await this.exercisesRepository.findByIdHaveQuestionBank(id)
            if (!result) {
                throw ExercisesNotFoundException
            }

            return {
                statusCode: 200,
                data: result,
                message: EXERCISES_MESSAGE.GET_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error getting exercise by ID (plain):', error)
            if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
                throw error
            }
            throw InvalidExercisesDataException
        }
    }

    async getExercisesByLessonId(lessonId: number): Promise<MessageResDTO> {
        try {
            this.logger.log(`Getting exercises by lesson ID: ${lessonId}`)

            const result = await this.exercisesRepository.findByLessonId(lessonId)
            this.logger.log(`Found ${result.length} exercises for lesson ${lessonId}`)

            return {
                statusCode: 200,
                data: result,
                message: EXERCISES_MESSAGE.GET_LIST_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error getting exercises by lesson ID:', error)
            if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
                throw error
            }
            throw InvalidExercisesDataException
        }
    }

}