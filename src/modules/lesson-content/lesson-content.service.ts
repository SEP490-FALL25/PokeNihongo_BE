import { Injectable, Logger } from '@nestjs/common'
import {
    CreateLessonContentBodyType,
    UpdateLessonContentBodyType,
    GetLessonContentByIdParamsType,
    GetLessonContentListQueryType,
    CreateMutiLessonContentBodyType,
    UpdateLessonContentOrder,
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
import { LessonContentSortField, SortOrder } from '@/common/enum/enum'

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

    async getLessonContentById(id: number) {
        try {
            this.logger.log(`Getting lesson content by id: ${id}`)

            const content = await this.lessonContentRepository.findById(id)

            if (!content) {
                throw new LessonContentNotFoundException()
            }

            this.logger.log(`Found lesson content: ${content.id}`)
            return {
                data: content,
                message: 'Lấy thông tin nội dung bài học thành công'
            }
        } catch (error) {
            this.logger.error(`Error getting lesson content by id ${id}:`, error)

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
            const maxOrder = await this.lessonContentRepository.getMaxContentOrder(createData.lessonId, createData.contentType);

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

    async updateLessonContentOrder(data: UpdateLessonContentOrder) {
        try {
            this.logger.log('Đang cập nhật thứ tự nội dung:', data);

            // Kiểm tra mảng đầu vào
            if (!data.contentId?.length) {
                throw new InvalidLessonContentDataException('Danh sách thứ tự không được để trống');
            }

            // Lấy content đầu tiên để kiểm tra
            const firstContent = await this.lessonContentRepository.findById(data.contentId[0]);
            if (!firstContent) {
                throw new LessonContentNotFoundException();
            }

            // Lấy tất cả content cùng loại trong lesson
            const contentsInLesson = await this.lessonContentRepository.findMany({
                lessonId: firstContent.lessonId,
                contentType: data.contentType,
                page: 1,
                limit: 100,
                sortBy: LessonContentSortField.CONTENT_ORDER,
                sort: SortOrder.ASC
            });

            // Kiểm tra tất cả contentIds phải thuộc cùng lesson và cùng contentType
            const validContentIds = new Set(contentsInLesson.data.map(content => content.id));
            const invalidContentIds = data.contentId.filter(id => !validContentIds.has(id));

            if (invalidContentIds.length > 0) {
                throw new InvalidLessonContentDataException(
                    `Các content ${invalidContentIds.join(', ')} không thuộc cùng loại ${data.contentType} trong lesson ${firstContent.lessonId}`
                );
            }

            // Cập nhật thứ tự mới, bắt đầu từ 1 cho mỗi contentType
            const updatedContents = await Promise.all(
                data.contentId.map((contentId, index) => {
                    return this.lessonContentRepository.update(contentId, {
                        contentOrder: index + 1
                    });
                })
            );

            this.logger.log(`Đã cập nhật ${updatedContents.length} thứ tự nội dung ${data.contentType}`);
            return {
                data: updatedContents,
                message: 'Cập nhật thứ tự nội dung bài học thành công'
            };
        } catch (error) {
            this.logger.error('Lỗi khi cập nhật thứ tự nội dung:', error);

            if (error instanceof LessonContentNotFoundException ||
                error instanceof InvalidLessonContentDataException) {
                throw error;
            }

            throw new InvalidLessonContentDataException('Lỗi khi cập nhật thứ tự nội dung bài học');
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
