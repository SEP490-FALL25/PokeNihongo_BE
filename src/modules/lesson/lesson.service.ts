import { Injectable, Logger } from '@nestjs/common'
import {
    CreateLessonBodyType,
    UpdateLessonBodyType,
    GetLessonByIdParamsType,
    GetLessonListQueryType,
} from './entities/lesson.entities'
import {
    LessonNotFoundException,
    LessonAlreadyExistsException,
    InvalidLessonDataException,
    LessonCategoryNotFoundException,
    LessonCategoryAlreadyExistsException,
    LessonContentsNotFoundException,
    LessonContentsAlreadyExistsException,
    InvalidLessonContentsDataException,
    RewardNotFoundException,
} from './dto/lesson.error'
import { LessonRepository } from './lesson.repo'
import { LessonCategoryService } from '../lesson-category/lesson-category.service'
import { TranslationService } from '../translation/translation.service'
import { LanguagesService } from '../languages/languages.service'
import { LESSON_MESSAGE } from '@/common/constants/message'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'

@Injectable()
export class LessonService {
    private readonly logger = new Logger(LessonService.name)

    constructor(
        private readonly lessonRepository: LessonRepository,
        private readonly lessonCategoryService: LessonCategoryService,
        private readonly translationService: TranslationService,
        private readonly languagesService: LanguagesService
    ) { }

    //#region get
    async getLessonList(params: GetLessonListQueryType, languageCode?: string) {
        try {
            this.logger.log('Getting lesson list with params:', params)

            const result = await this.lessonRepository.findMany(params)

            // Lấy language ID (chỉ khi có languageCode)
            let languageId: number | undefined
            if (languageCode) {
                try {
                    const language = await this.languagesService.findByCode({ code: languageCode })
                    languageId = language?.data?.id
                } catch {
                    this.logger.warn(`Language ${languageCode} not found, using all languages`)
                }
            }

            // Lấy translations cho từng lesson
            const lessonsWithTranslations = await Promise.all(
                result.data.map(async (lesson) => {
                    let title: string | Array<{ language: string; value: string }> = ''
                    if (lesson.titleKey) {
                        this.logger.log(`Looking for translations for key: ${lesson.titleKey}`)
                        if (languageId) {
                            // Lấy translation của 1 ngôn ngữ cụ thể
                            const titleTranslation = await this.translationService.findByKeyAndLanguage(lesson.titleKey, languageId)
                            this.logger.log(`Found single translation:`, titleTranslation)
                            title = titleTranslation?.value || ''
                        } else {
                            // Lấy tất cả translations
                            const titleTranslations = await this.translationService.findByKey({ key: lesson.titleKey })
                            this.logger.log(`Found all translations:`, titleTranslations)
                            title = titleTranslations.translations?.map(t => ({
                                language: `lang_${t.languageId}`,
                                value: t.value
                            })) || []
                        }
                    } else {
                        this.logger.warn(`No titleKey found for lesson: ${lesson.id}`)
                    }

                    return {
                        ...lesson,
                        title
                    }
                })
            )

            this.logger.log(`Found ${result.data.length} lessons`)
            return {
                statusCode: 200,
                message: LESSON_MESSAGE.GET_LIST_SUCCESS,
                data: {
                    results: lessonsWithTranslations,
                    pagination: {
                        current: result.page,
                        pageSize: result.limit,
                        totalPage: result.totalPages,
                        totalItem: result.total
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error getting lesson list:', error)
            throw error
        }
    }

    async getLessonById(id: number, languageCode?: string) {
        try {
            this.logger.log(`Getting lesson by id: ${id} with language ${languageCode || 'all'}`)

            const lesson = await this.lessonRepository.findById(id)

            if (!lesson) {
                throw new LessonNotFoundException()
            }

            // Lấy language ID (chỉ khi có languageCode)
            let languageId: number | undefined
            if (languageCode) {
                try {
                    const language = await this.languagesService.findByCode({ code: languageCode })
                    languageId = language?.data?.id
                } catch {
                    this.logger.warn(`Language ${languageCode} not found, using all languages`)
                }
            }

            // Lấy translations cho lesson
            let title: string | Array<{ language: string; value: string }> = ''
            if (lesson.titleKey) {
                this.logger.log(`Looking for translations for key: ${lesson.titleKey}`)
                if (languageId) {
                    // Lấy translation của 1 ngôn ngữ cụ thể
                    const titleTranslation = await this.translationService.findByKeyAndLanguage(lesson.titleKey, languageId)
                    this.logger.log(`Found single translation:`, titleTranslation)
                    title = titleTranslation?.value || ''
                } else {
                    // Lấy tất cả translations
                    const titleTranslations = await this.translationService.findByKey({ key: lesson.titleKey })
                    this.logger.log(`Found all translations:`, titleTranslations)
                    title = titleTranslations.translations?.map(t => ({
                        language: `lang_${t.languageId}`,
                        value: t.value
                    })) || []
                }
            } else {
                this.logger.warn(`No titleKey found for lesson: ${lesson.id}`)
            }

            const lessonWithTranslations = {
                ...lesson,
                title
            }

            this.logger.log(`Found lesson: ${lesson.slug}`)
            return {
                data: lessonWithTranslations,
                message: LESSON_MESSAGE.GET_BY_ID_SUCCESS
            }
        } catch (error) {
            this.logger.error(`Error getting lesson by id ${id}:`, error)

            if (error instanceof LessonNotFoundException) {
                throw error
            }

            throw new InvalidLessonDataException('Lỗi khi lấy thông tin bài học')
        }
    }

    async getLessonBySlug(slug: string, languageCode?: string) {
        try {
            this.logger.log(`Getting lesson by slug: ${slug} with language ${languageCode || 'all'}`)

            const lesson = await this.lessonRepository.findBySlug(slug)

            if (!lesson) {
                throw new LessonNotFoundException()
            }

            // Lấy language ID (chỉ khi có languageCode)
            let languageId: number | undefined
            if (languageCode) {
                try {
                    const language = await this.languagesService.findByCode({ code: languageCode })
                    languageId = language?.data?.id
                } catch {
                    this.logger.warn(`Language ${languageCode} not found, using all languages`)
                }
            }

            // Lấy translations cho lesson
            let title: string | Array<{ language: string; value: string }> = ''
            if (lesson.titleKey) {
                this.logger.log(`Looking for translations for key: ${lesson.titleKey}`)
                if (languageId) {
                    // Lấy translation của 1 ngôn ngữ cụ thể
                    const titleTranslation = await this.translationService.findByKeyAndLanguage(lesson.titleKey, languageId)
                    this.logger.log(`Found single translation:`, titleTranslation)
                    title = titleTranslation?.value || ''
                } else {
                    // Lấy tất cả translations
                    const titleTranslations = await this.translationService.findByKey({ key: lesson.titleKey })
                    this.logger.log(`Found all translations:`, titleTranslations)
                    title = titleTranslations.translations?.map(t => ({
                        language: `lang_${t.languageId}`,
                        value: t.value
                    })) || []
                }
            } else {
                this.logger.warn(`No titleKey found for lesson: ${lesson.id}`)
            }

            const lessonWithTranslations = {
                ...lesson,
                title
            }

            this.logger.log(`Found lesson: ${lesson.slug}`)
            return {
                data: lessonWithTranslations,
                message: LESSON_MESSAGE.GET_BY_ID_SUCCESS
            }
        } catch (error) {
            this.logger.error(`Error getting lesson by slug ${slug}:`, error)

            if (error instanceof LessonNotFoundException) {
                throw error
            }

            throw new InvalidLessonDataException('Lỗi khi lấy thông tin bài học')
        }
    }
    //#endregion

    //#region create
    async createLesson(data: CreateLessonBodyType, userId: number) {
        try {
            this.logger.log('Creating lesson with data:', data)

            // Validate category exists
            try {
                await this.lessonCategoryService.getLessonCategoryById({ id: data.lessonCategoryId })
            } catch (error) {
                throw new LessonCategoryNotFoundException()
            }

            // Validate reward exists if provided
            if (data.rewardId) {
                const rewardExists = await this.lessonRepository.checkRewardExists(data.rewardId)
                if (!rewardExists) {
                    throw new RewardNotFoundException()
                }
            }

            // Auto-generate titleKey (will be updated with actual lesson ID after creation)
            const titleKey = `lesson.temp.${Date.now()}.title`

            // Remove translations and slug from data before passing to Prisma
            const { translations, slug, ...lessonData } = data

            const lesson = await this.lessonRepository.create({
                ...lessonData,
                titleKey, // Use the generated/validated titleKey
                slug: `lesson-temp-${Date.now()}`, // Temporary slug
                createdById: userId,
            })

            // Cập nhật titleKey và slug với ID thực tế
            const finalTitleKey = `lesson.${lesson.id}.title`
            const finalSlug = `lesson-${lesson.id}`

            // Cập nhật titleKey và slug trong database
            await this.lessonRepository.update(lesson.id, {
                titleKey: finalTitleKey,
                slug: finalSlug
            })

            // Tự động tạo translation keys
            try {
                await this.createTranslationKeys(lesson.id, finalTitleKey, data.titleJp, translations)
                this.logger.log(`Translation keys created for lesson: ${lesson.id}`)
            } catch (translationError) {
                this.logger.warn(`Failed to create translation keys for lesson ${lesson.id}:`, translationError)
                // Không throw error vì lesson đã tạo thành công
            }

            // Lấy lesson đã được cập nhật với slug mới
            const updatedLesson = await this.lessonRepository.findById(lesson.id)

            this.logger.log(`Created lesson: ${finalSlug}`)
            return {
                data: updatedLesson,
                message: LESSON_MESSAGE.CREATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error creating lesson:', error)

            if (error instanceof LessonCategoryNotFoundException ||
                error instanceof RewardNotFoundException ||
                error instanceof LessonAlreadyExistsException) {
                throw error
            }

            if (isUniqueConstraintPrismaError(error)) {
                throw new LessonAlreadyExistsException()
            }

            throw new InvalidLessonDataException('Lỗi khi tạo bài học')
        }
    }
    //#endregion

    //#region update
    async updateLesson(id: number, data: UpdateLessonBodyType) {
        try {
            this.logger.log(`Updating lesson ${id} with data:`, data)

            // Check if lesson exists
            const lessonExists = await this.lessonRepository.checkLessonExists(id)
            if (!lessonExists) {
                throw new LessonNotFoundException()
            }

            // Validate category exists if provided
            if (data.lessonCategoryId) {
                try {
                    await this.lessonCategoryService.getLessonCategoryById({ id: data.lessonCategoryId })
                } catch (error) {
                    throw new LessonCategoryNotFoundException()
                }
            }

            // Validate reward exists if provided
            if (data.rewardId) {
                const rewardExists = await this.lessonRepository.checkRewardExists(data.rewardId)
                if (!rewardExists) {
                    throw new RewardNotFoundException()
                }
            }

            // Remove slug from update data since slug is auto-generated as lesson-{id}
            const { slug, ...updateData } = data

            const lesson = await this.lessonRepository.update(id, updateData)

            this.logger.log(`Updated lesson: ${lesson.slug}`)
            return {
                data: lesson,
                message: LESSON_MESSAGE.UPDATE_SUCCESS
            }
        } catch (error) {
            this.logger.error(`Error updating lesson ${id}:`, error)

            if (error instanceof LessonNotFoundException ||
                error instanceof LessonCategoryNotFoundException ||
                error instanceof RewardNotFoundException ||
                error instanceof LessonAlreadyExistsException) {
                throw error
            }

            if (isUniqueConstraintPrismaError(error)) {
                throw new LessonAlreadyExistsException()
            }

            throw new InvalidLessonDataException('Lỗi khi cập nhật bài học')
        }
    }
    //#endregion

    //#region toggle publish
    async togglePublishLesson(id: number) {
        try {
            this.logger.log(`Toggling publish status for lesson ${id}`)

            // Get current lesson status
            const lesson = await this.lessonRepository.findById(id)
            if (!lesson) {
                throw new LessonNotFoundException()
            }

            // Toggle publish status
            const newPublishedStatus = !lesson.isPublished
            const updatedLesson = await this.lessonRepository.update(id, {
                isPublished: newPublishedStatus
            })

            const message = newPublishedStatus
                ? LESSON_MESSAGE.PUBLISH_SUCCESS
                : LESSON_MESSAGE.UNPUBLISH_SUCCESS

            this.logger.log(`${newPublishedStatus ? 'Published' : 'Unpublished'} lesson ${id}`)
            return {
                data: updatedLesson,
                message
            }
        } catch (error) {
            this.logger.error(`Error toggling publish status for lesson ${id}:`, error)

            if (error instanceof LessonNotFoundException) {
                throw error
            }

            if (isNotFoundPrismaError(error)) {
                throw new LessonNotFoundException()
            }

            throw new InvalidLessonDataException('Lỗi khi thay đổi trạng thái xuất bản bài học')
        }
    }
    //#endregion

    //#region delete
    async deleteLesson(id: number) {
        try {
            this.logger.log(`Deleting lesson ${id}`)

            // Check if lesson exists
            const lessonExists = await this.lessonRepository.checkLessonExists(id)
            if (!lessonExists) {
                throw new LessonNotFoundException()
            }

            await this.lessonRepository.delete(id)

            this.logger.log(`Deleted lesson ${id}`)
            return {
                message: LESSON_MESSAGE.DELETE_SUCCESS
            }
        } catch (error) {
            this.logger.error(`Error deleting lesson ${id}:`, error)

            if (error instanceof LessonNotFoundException) {
                throw error
            }

            if (isNotFoundPrismaError(error)) {
                throw new LessonNotFoundException()
            }

            throw new InvalidLessonDataException('Lỗi khi xóa bài học')
        }
    }
    //#endregion

    //#region getLanguageIdByCode
    /**
     * Lấy languageId từ language_code
     */
    private getLanguageIdByCode(languageCode: string): number | null {
        // Hardcode language IDs (thường thì vi=1, en=2)
        const languageMap: { [key: string]: number } = {
            'vi': 1,
            'en': 2,
            'ja': 3
        }
        return languageMap[languageCode] || null
    }
    //#endregion

    //#region createTranslationKeys
    /**
     * Tự động tạo translation keys cho lesson
     */
    private async createTranslationKeys(lessonId: number, titleKey: string, titleJp: string, translations?: { meaning: Array<{ language_code: string; value: string }> }) {
        try {
            // Nếu có translations được cung cấp, sử dụng chúng
            if (translations && translations.meaning && translations.meaning.length > 0) {
                // Tạo translations từ data được cung cấp
                const translationPromises = translations.meaning.map(async (translation) => {
                    // Lấy languageId từ language_code
                    const languageId = this.getLanguageIdByCode(translation.language_code)
                    if (languageId) {
                        return this.translationService.create({
                            key: titleKey,
                            languageId: languageId,
                            value: translation.value
                        }).catch(error => {
                            this.logger.warn(`Failed to create translation for ${translation.language_code}:`, error)
                            return null
                        })
                    }
                    return null
                })

                await Promise.all(translationPromises.filter(Boolean))
                this.logger.log(`Custom translations created for lesson ${lessonId}: ${titleKey}`)
                return
            }

            // Fallback: tạo translations mặc định với titleJp
            const vietnameseTranslation = {
                key: titleKey,
                languageId: 1, // Vietnamese
                value: titleJp, // Sử dụng titleJp làm giá trị mặc định
            }

            const englishTranslation = {
                key: titleKey,
                languageId: 2, // English
                value: titleJp, // Sử dụng titleJp làm giá trị mặc định
            }

            // Tạo tất cả translations
            await Promise.all([
                this.translationService.create(vietnameseTranslation).catch(error => {
                    this.logger.warn(`Failed to create Vietnamese translation for ${titleKey}:`, error)
                }),
                this.translationService.create(englishTranslation).catch(error => {
                    this.logger.warn(`Failed to create English translation for ${titleKey}:`, error)
                })
            ])

            this.logger.log(`Translation keys created successfully for lesson ${lessonId}`)
        } catch (error) {
            this.logger.error(`Error creating translation keys for lesson ${lessonId}:`, error)
            throw error
        }
    }
    //#endregion    
}
