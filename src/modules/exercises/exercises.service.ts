import { Injectable, Logger, HttpException } from '@nestjs/common'
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

            // Check if lesson exists
            if (data.lessonId) {
                const lessonExists = await this.exercisesRepository.checkLessonExists(data.lessonId)
                if (!lessonExists) {
                    throw LessonNotFoundException
                }
            }

            // Check if testSet exists (if provided)
            if (data.testSetId) {
                const testSetExists = await this.exercisesRepository.checkTestSetExists(data.testSetId)
                if (!testSetExists) {
                    throw InvalidExercisesDataException
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
                throw ExercisesAlreadyExistsException
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

            const result = await this.exercisesRepository.findById(id)
            if (!result) {
                throw ExercisesNotFoundException
            }

            this.logger.log(`Exercise found: ${result.id}`)

            return result
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

            return result
        } catch (error) {
            this.logger.error('Error getting exercises by lesson ID:', error)
            if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
                throw error
            }
            throw InvalidExercisesDataException
        }
    }
}