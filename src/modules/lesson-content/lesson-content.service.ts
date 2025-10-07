import { Injectable, Logger } from '@nestjs/common'
import {
    CreateLessonContentBodyType,
    UpdateLessonContentBodyType,
    GetLessonContentByIdParamsType,
    GetLessonContentListQueryType,
} from './entities/lesson-content.entities'
import {
    LessonContentNotFoundException,
    LessonContentAlreadyExistsException,
    InvalidLessonContentDataException,
    LessonNotFoundException,
} from './dto/lesson-content.error'
import { LessonContentRepository } from './lesson-content.repo'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'

@Injectable()
export class LessonContentService {
    private readonly logger = new Logger(LessonContentService.name)

    constructor(private readonly lessonContentRepository: LessonContentRepository) { }

    async getLessonContentList(params: GetLessonContentListQueryType) {
        try {
            this.logger.log('Getting lesson content list with params:', params)

            const result = await this.lessonContentRepository.findMany(params)

            this.logger.log(`Found ${result.data.length} lesson contents`)
            return {
                ...result,
                message: 'Lấy danh sách nội dung bài học thành công'
            }
        } catch (error) {
            this.logger.error('Error getting lesson content list:', error)
            throw error
        }
    }

    async getLessonContentById(params: GetLessonContentByIdParamsType) {
        try {
            this.logger.log(`Getting lesson content by id: ${params.id}`)

            const content = await this.lessonContentRepository.findById(params.id)

            if (!content) {
                throw new LessonContentNotFoundException()
            }

            this.logger.log(`Found lesson content: ${content.id}`)
            return {
                data: content,
                message: 'Lấy thông tin nội dung bài học thành công'
            }
        } catch (error) {
            this.logger.error(`Error getting lesson content by id ${params.id}:`, error)

            if (error instanceof LessonContentNotFoundException) {
                throw error
            }

            throw new InvalidLessonContentDataException('Lỗi khi lấy thông tin nội dung bài học')
        }
    }

    async createLessonContent(data: CreateLessonContentBodyType) {
        try {
            this.logger.log('Creating lesson content with data:', data)

            // Validate lesson exists
            const lessonExists = await this.lessonContentRepository.checkLessonExists(data.lessonId)
            if (!lessonExists) {
                throw new LessonNotFoundException()
            }

            const content = await this.lessonContentRepository.create(data)

            this.logger.log(`Created lesson content: ${content.id}`)
            return {
                data: content,
                message: 'Tạo nội dung bài học thành công'
            }
        } catch (error) {
            this.logger.error('Error creating lesson content:', error)

            if (error instanceof LessonNotFoundException) {
                throw error
            }

            if (isUniqueConstraintPrismaError(error)) {
                throw new LessonContentAlreadyExistsException()
            }

            throw new InvalidLessonContentDataException('Lỗi khi tạo nội dung bài học')
        }
    }

    async updateLessonContent(id: number, data: UpdateLessonContentBodyType) {
        try {
            this.logger.log(`Updating lesson content ${id} with data:`, data)

            // Check if content exists
            const content = await this.lessonContentRepository.findById(id)
            if (!content) {
                throw new LessonContentNotFoundException()
            }

            const updatedContent = await this.lessonContentRepository.update(id, data)

            this.logger.log(`Updated lesson content: ${updatedContent.id}`)
            return {
                data: updatedContent,
                message: 'Cập nhật nội dung bài học thành công'
            }
        } catch (error) {
            this.logger.error(`Error updating lesson content ${id}:`, error)

            if (error instanceof LessonContentNotFoundException) {
                throw error
            }

            throw new InvalidLessonContentDataException('Lỗi khi cập nhật nội dung bài học')
        }
    }

    async deleteLessonContent(id: number) {
        try {
            this.logger.log(`Deleting lesson content ${id}`)

            // Check if content exists
            const content = await this.lessonContentRepository.findById(id)
            if (!content) {
                throw new LessonContentNotFoundException()
            }

            await this.lessonContentRepository.delete(id)

            this.logger.log(`Deleted lesson content ${id}`)
            return {
                message: 'Xóa nội dung bài học thành công'
            }
        } catch (error) {
            this.logger.error(`Error deleting lesson content ${id}:`, error)

            if (error instanceof LessonContentNotFoundException) {
                throw error
            }

            if (isNotFoundPrismaError(error)) {
                throw new LessonContentNotFoundException()
            }

            throw new InvalidLessonContentDataException('Lỗi khi xóa nội dung bài học')
        }
    }
}
