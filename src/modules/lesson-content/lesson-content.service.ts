import { Injectable, Logger } from '@nestjs/common'
import {
    CreateLessonContentBodyType,
    UpdateLessonContentBodyType,
    GetLessonContentByIdParamsType,
    GetLessonContentListQueryType,
    CreateMutiLessonContentBodyType,
    UpdateLessonContentOrder,
    GroupedLessonContentType,
    LessonContentFullResType,
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
import { VocabularyService } from '../vocabulary/vocabulary.service'
import { GrammarRepository } from '../grammar/grammar.repo'
import { KanjiService } from '../kanji/kanji.service'
import { TranslationService } from '../translation/translation.service'
import { LanguagesService } from '../languages/languages.service'
import { MeaningService } from '../meaning/meaning.service'

@Injectable()
export class LessonContentService {
    private readonly logger = new Logger(LessonContentService.name)

    constructor(
        private readonly lessonContentRepository: LessonContentRepository,
        private readonly vocabularyService: VocabularyService,
        private readonly grammarRepository: GrammarRepository,
        private readonly kanjiService: KanjiService,
        private readonly translationService: TranslationService,
        private readonly languagesService: LanguagesService,
        private readonly meaningService: MeaningService
    ) { }

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
            if (!data.lessonContentId?.length) {
                throw new InvalidLessonContentDataException('Danh sách thứ tự không được để trống');
            }

            // Lấy content đầu tiên để kiểm tra
            const firstContent = await this.lessonContentRepository.findById(data.lessonContentId[0]);
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
            const invalidContentIds = data.lessonContentId.filter(id => !validContentIds.has(id));

            if (invalidContentIds.length > 0) {
                throw new InvalidLessonContentDataException(
                    `Các content ${invalidContentIds.join(', ')} không thuộc cùng loại ${data.contentType} trong lesson ${firstContent.lessonId}`
                );
            }

            // Cập nhật thứ tự mới, bắt đầu từ 1 cho mỗi contentType
            const updatedContents = await Promise.all(
                data.lessonContentId.map((contentId, index) => {
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
            return 'Xóa nội dung bài học thành công'
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

    async getLessonContentFull(lessonId: number, languageCode: string = 'vi'): Promise<LessonContentFullResType> {
        try {
            this.logger.log(`Getting full lesson content for lesson ${lessonId} with language ${languageCode}`)

            // Lấy tất cả lesson content của lesson này
            const lessonContents = await this.lessonContentRepository.findMany({
                lessonId,
                page: 1,
                limit: 1000, // Lấy tất cả
                sortBy: LessonContentSortField.CONTENT_ORDER,
                sort: SortOrder.ASC
            })

            // Lấy language ID
            let languageId: number | undefined
            try {
                const language = await this.languagesService.findByCode({ code: languageCode })
                languageId = language?.data?.id
            } catch {
                this.logger.warn(`Language ${languageCode} not found, using default`)
            }

            // Nhóm content theo type
            const groupedContent: GroupedLessonContentType = {}

            // Xử lý VOCABULARY
            const vocabularyContents = lessonContents.data.filter(lc => lc.contentType === 'VOCABULARY')
            if (vocabularyContents.length > 0) {
                const vocaResults = await Promise.all(
                    vocabularyContents.map(async (lc) => {
                        try {
                            // Lấy từng vocabulary theo ID
                            const vocab = await this.vocabularyService.findOne(lc.contentId, languageCode)
                            if (!vocab.data) return null

                            // Lấy meanings từ repository
                            const meaningsData = await this.meaningService.findByVocabularyId(vocab.data.id)

                            // Lấy translations cho từng meaning
                            const meanings = await Promise.all(
                                meaningsData.map(async (meaning) => {
                                    const meaningTranslation = languageId && meaning.meaningKey ?
                                        await this.translationService.findByKeyAndLanguage(meaning.meaningKey, languageId) :
                                        null
                                    const exampleTranslation = languageId && meaning.exampleSentenceKey ?
                                        await this.translationService.findByKeyAndLanguage(meaning.exampleSentenceKey, languageId) :
                                        null
                                    const explanationTranslation = languageId && meaning.explanationKey ?
                                        await this.translationService.findByKeyAndLanguage(meaning.explanationKey, languageId) :
                                        null

                                    return {
                                        id: meaning.id,
                                        meaning: meaningTranslation?.value || '',
                                        exampleSentence: exampleTranslation?.value || meaning.exampleSentenceJp || '',
                                        explanation: explanationTranslation?.value || ''
                                    }
                                })
                            )

                            return {
                                id: vocab.data.id,
                                wordJp: vocab.data.wordJp,
                                reading: vocab.data.reading,
                                imageUrl: vocab.data.imageUrl,
                                audioUrl: vocab.data.audioUrl,
                                meanings: meanings
                            }
                        } catch (error) {
                            this.logger.warn(`Error getting vocabulary ${lc.contentId}:`, error)
                            return null
                        }
                    })
                )
                // Lọc bỏ các item null và cast type
                groupedContent.voca = vocaResults.filter((item): item is NonNullable<typeof item> => item !== null)
            }

            // Xử lý GRAMMAR
            const grammarContents = lessonContents.data.filter(lc => lc.contentType === 'GRAMMAR')
            if (grammarContents.length > 0) {
                const gramaResults = await Promise.all(
                    grammarContents.map(async (lc) => {
                        try {
                            // Lấy từng grammar theo ID
                            const grammar = await this.grammarRepository.findById(lc.contentId)
                            if (!grammar) return null

                            // Lấy usage đầu tiên để lấy translations
                            const firstUsage = grammar.usages?.[0]
                            if (!firstUsage) return null

                            // Lấy translations cho grammar
                            const explanation = languageId ?
                                await this.translationService.findByKeyAndLanguage(firstUsage.explanationKey, languageId) :
                                null
                            const exampleSentence = languageId ?
                                await this.translationService.findByKeyAndLanguage(firstUsage.exampleSentenceKey, languageId) :
                                null

                            return {
                                id: grammar.id,
                                titleKey: firstUsage.explanationKey, // Sử dụng explanationKey làm title
                                title: explanation?.value || '',
                                descriptionKey: firstUsage.explanationKey,
                                description: explanation?.value || '',
                                usageKey: firstUsage.exampleSentenceKey,
                                usage: exampleSentence?.value || ''
                            }
                        } catch (error) {
                            this.logger.warn(`Error getting grammar ${lc.contentId}:`, error)
                            return null
                        }
                    })
                )
                // Lọc bỏ các item null và cast type
                groupedContent.grama = gramaResults.filter((item): item is NonNullable<typeof item> => item !== null)
            }

            // Xử lý KANJI
            const kanjiContents = lessonContents.data.filter(lc => lc.contentType === 'KANJI')
            if (kanjiContents.length > 0) {
                const kanjiResults = await Promise.all(
                    kanjiContents.map(async (lc) => {
                        try {
                            // Lấy từng kanji theo ID
                            const kanji = await this.kanjiService.findById(lc.contentId)
                            if (!kanji.data) return null

                            // Lấy translation cho meaning
                            const meaning = languageId ?
                                await this.translationService.findByKeyAndLanguage(kanji.data.meaningKey, languageId) :
                                null

                            // Tách readings thành on và kun
                            const onReadings = kanji.data.readings?.filter(r => r.readingType === 'ON').map(r => r.reading) || []
                            const kunReadings = kanji.data.readings?.filter(r => r.readingType === 'KUN').map(r => r.reading) || []

                            return {
                                id: kanji.data.id,
                                character: kanji.data.character,
                                meaningKey: kanji.data.meaningKey,
                                meaning: meaning?.value || '',
                                onReading: onReadings.join(', '),
                                kunReading: kunReadings.join(', '),
                                strokeCount: kanji.data.strokeCount || undefined,
                                imageUrl: kanji.data.img
                            }
                        } catch (error) {
                            this.logger.warn(`Error getting kanji ${lc.contentId}:`, error)
                            return null
                        }
                    })
                )
                // Lọc bỏ các item null và cast type
                groupedContent.kanji = kanjiResults.filter((item): item is NonNullable<typeof item> => item !== null)
            }

            this.logger.log(`Successfully retrieved grouped lesson content for lesson ${lessonId}`)

            return {
                statusCode: 200,
                data: groupedContent,
                message: 'Lấy toàn bộ nội dung bài học thành công'
            }
        } catch (error) {
            this.logger.error(`Error getting full lesson content for lesson ${lessonId}:`, error)
            throw new InvalidLessonContentDataException('Lỗi khi lấy nội dung bài học')
        }
    }
}
