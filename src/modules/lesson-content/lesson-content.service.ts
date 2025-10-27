import { Injectable, Logger } from '@nestjs/common'
import {
    CreateLessonContentBodyType,
    UpdateLessonContentBodyType,
    GetLessonContentByIdParamsType,
    GetLessonContentListQueryType,
    CreateMutiLessonContentBodyType,
} from './entities/lesson-content.entities'
import {
    LessonContentNotFoundException,
    LessonContentAlreadyExistsException,
    InvalidLessonContentDataException,
    LessonNotFoundException,
    ContentAlreadyExistsInLessonException,
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

    async createLessonContent(createData: CreateMutiLessonContentBodyType) {
        try {
            this.logger.log('Creating multiple lesson contents with data:', createData);

            // Validate lesson exists
            const lessonExists = await this.lessonContentRepository.checkLessonExists(createData.lessonId);
            if (!lessonExists) {
                throw new LessonNotFoundException();
            }

            // Validate contentId array
            if (!createData.contentId?.length) {
                throw new InvalidLessonContentDataException('Danh sách contentId không được để trống');
            }

            // Get current max order once
            const maxOrder = await this.lessonContentRepository.getMaxContentOrder(createData.lessonId);

            // Check all contents existence first
            const existenceChecks = await Promise.all(
                createData.contentId.map(contentId =>
                    this.lessonContentRepository.checkContentExistsInLesson(
                        createData.lessonId,
                        contentId,
                        createData.contentType
                    )
                )
            );

            // Kiểm tra tất cả các content đã tồn tại
            const existingContents = createData.contentId.filter((_, index) => existenceChecks[index]);
            if (existingContents.length > 0) {
                throw new ContentAlreadyExistsInLessonException(
                    `[${existingContents.join(', ')}]`,
                    createData.contentType,
                    createData.lessonId
                );
            }

            // Create all contents in parallel
            const createdContents = await Promise.all(
                createData.contentId.map((contentId, index) => {
                    const contentData = {
                        ...createData,
                        contentId,
                        contentOrder: maxOrder + index + 1
                    };
                    return this.lessonContentRepository.create(contentData);
                })
            );

            this.logger.log(`Created ${createdContents.length} lesson contents successfully`);
            return {
                data: createdContents,
                message: 'Tạo nội dung bài học thành công'
            };
        } catch (error) {
            this.logger.error('Error creating lesson contents:', error);

            if (error instanceof LessonNotFoundException ||
                error instanceof ContentAlreadyExistsInLessonException ||
                error instanceof InvalidLessonContentDataException) {
                throw error;
            }

            if (isUniqueConstraintPrismaError(error)) {
                throw new LessonContentAlreadyExistsException();
            }

            throw new InvalidLessonContentDataException('Lỗi khi tạo nội dung bài học');
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
