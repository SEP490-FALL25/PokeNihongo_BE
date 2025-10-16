import { Injectable, Logger } from '@nestjs/common'
import {
    CreateQuestionBodyType,
    UpdateQuestionBodyType,
    GetQuestionByIdParamsType,
    GetQuestionListQueryType,
} from './entities/question.entities'
import {
    QuestionNotFoundException,
    QuestionAlreadyExistsException,
    QuestionContentAlreadyExistsException,
    InvalidJapaneseContentException,
    InvalidQuestionDataException,
    ExercisesNotFoundException,
} from './dto/question.error'
import { QuestionRepository } from './question.repo'
import { TranslationService } from '@/modules/translation/translation.service'
import { LanguagesService } from '@/modules/languages/languages.service'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'

@Injectable()
export class QuestionService {
    private readonly logger = new Logger(QuestionService.name)

    constructor(
        private readonly questionRepository: QuestionRepository,
        private readonly translationService: TranslationService,
        private readonly languagesService: LanguagesService,
    ) { }

    //#region Get Question
    async getQuestionList(params: GetQuestionListQueryType, lang: string) {
        try {
            this.logger.log('Getting question list with params:', params)

            const result = await this.questionRepository.findMany(params)

            // Get language ID for translations
            let languageId: number | undefined
            try {
                const language = await this.languagesService.findByCode({ code: lang })
                languageId = language?.data?.id
            } catch {
                languageId = undefined
            }

            // Add translations for each question
            const resultsWithTranslations = await Promise.all(
                result.data.map(async (question) => {
                    if (!languageId) {
                        // If no language, return question without questionKey
                        const { questionKey, ...questionWithoutKey } = question
                        return questionWithoutKey
                    }

                    try {
                        if (!question.questionKey) {
                            // If no questionKey, return question without translation
                            const { questionKey, ...questionWithoutKey } = question
                            return questionWithoutKey
                        }

                        const translationResult = await this.translationService.findByKeyAndLanguage(
                            question.questionKey,
                            languageId as number
                        )
                        const translatedText = translationResult?.value || question.questionJp

                        // Remove questionKey and add translatedText
                        const { questionKey, ...questionWithoutKey } = question
                        return {
                            ...questionWithoutKey,
                            translatedText
                        }
                    } catch {
                        // Remove questionKey and fallback to original Japanese text
                        const { questionKey, ...questionWithoutKey } = question
                        return {
                            ...questionWithoutKey,
                            translatedText: question.questionJp
                        }
                    }
                })
            )

            this.logger.log(`Found ${result.data.length} question entries`)
            return {
                statusCode: 200,
                message: 'Lấy danh sách câu hỏi thành công',
                data: {
                    results: resultsWithTranslations,
                    pagination: {
                        current: result.page,
                        pageSize: result.limit,
                        totalPage: result.totalPages,
                        totalItem: result.total
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error getting question list:', error)
            throw error
        }
    }

    async getQuestionById(params: GetQuestionByIdParamsType) {
        try {
            this.logger.log(`Getting question by id: ${params.id}`)

            const question = await this.questionRepository.findById(params.id)

            if (!question) {
                throw new QuestionNotFoundException()
            }

            this.logger.log(`Found question: ${question.id}`)
            return {
                statusCode: 200,
                data: question,
                message: 'Lấy thông tin câu hỏi thành công'
            }
        } catch (error) {
            this.logger.error(`Error getting question by id ${params.id}:`, error)

            if (error instanceof QuestionNotFoundException) {
                throw error
            }

            throw new InvalidQuestionDataException('Lỗi khi lấy thông tin câu hỏi')
        }
    }
    //#endregion

    //#region Create Question
    async createQuestion(data: CreateQuestionBodyType) {
        try {
            this.logger.log('Creating question with data:', data)

            // Validate Japanese content
            if (!this.isJapanese(data.questionJp)) {
                throw new InvalidJapaneseContentException()
            }

            // Check if exercises exists
            const exercisesExists = await this.questionRepository.checkExercisesExists(data.exercisesId)
            if (!exercisesExists) {
                throw new ExercisesNotFoundException()
            }

            // Check if question content already exists in this exercise
            const existingQuestion = await this.questionRepository.checkQuestionExists(data.exercisesId, data.questionJp)
            if (existingQuestion) {
                throw new QuestionContentAlreadyExistsException()
            }

            // Get next question order automatically
            const nextOrder = await this.questionRepository.getNextQuestionOrder(data.exercisesId)
            this.logger.log(`Auto-calculated question order: ${nextOrder}`)

            // Remove translations from data before passing to Prisma
            const { translations, ...questionData } = data

            // Create question with auto-calculated order
            const tempData = { ...questionData, questionOrder: nextOrder, questionKey: 'temp' }
            const question = await this.questionRepository.create(tempData)

            // Generate questionKey with actual ID
            const questionKey = `question.${question.id}.text`

            // Update with correct questionKey
            const updatedQuestion = await this.questionRepository.update(question.id, { questionKey })

            // Create translation keys if provided
            if (translations && translations.meaning && translations.meaning.length > 0) {
                try {
                    await this.createTranslationKeys(question.id, questionKey, data.questionJp, translations)
                    this.logger.log(`Translation keys created for question: ${question.id}`)
                } catch (translationError) {
                    this.logger.warn(`Failed to create translation keys for question ${question.id}:`, translationError)
                    // Don't throw error as question was created successfully
                }
            } else {
                // Create default Vietnamese translation if no translations provided
                try {
                    await this.translationService.create({
                        key: questionKey,
                        languageId: 1, // Vietnamese
                        value: data.questionJp
                    })
                    this.logger.log(`Created default Vietnamese translation for question: ${question.id}`)
                } catch (translationError) {
                    this.logger.warn(`Failed to create default translation for question ${question.id}:`, translationError)
                }
            }

            // Fetch the question with translations for response
            const questionWithTranslations = await this.getQuestionWithTranslations(updatedQuestion.id)

            this.logger.log(`Created question: ${updatedQuestion.id} with order: ${nextOrder}`)
            return {
                statusCode: 201,
                data: questionWithTranslations,
                message: 'Tạo câu hỏi thành công'
            }
        } catch (error) {
            this.logger.error('Error creating question:', error)

            if (error instanceof ExercisesNotFoundException ||
                error instanceof QuestionAlreadyExistsException ||
                error instanceof QuestionContentAlreadyExistsException ||
                error instanceof InvalidJapaneseContentException) {
                throw error
            }

            if (isUniqueConstraintPrismaError(error)) {
                throw new QuestionAlreadyExistsException()
            }

            throw new InvalidQuestionDataException('Lỗi khi tạo câu hỏi')
        }
    }
    //#endregion

    //#region Update Question
    async updateQuestion(id: number, data: UpdateQuestionBodyType) {
        try {
            this.logger.log(`Updating question ${id} with data:`, data)

            // Validate Japanese content if questionJp is being updated
            if (data.questionJp && !this.isJapanese(data.questionJp)) {
                throw new InvalidJapaneseContentException()
            }

            // Check if question exists
            const question = await this.questionRepository.findById(id)
            if (!question) {
                throw new QuestionNotFoundException()
            }

            // Check if exercises exists (if updating exercisesId)
            if (data.exercisesId) {
                const exercisesExists = await this.questionRepository.checkExercisesExists(data.exercisesId)
                if (!exercisesExists) {
                    throw new ExercisesNotFoundException()
                }
            }

            // Update question first
            const updatedQuestion = await this.questionRepository.update(id, data)

            // Generate new questionKey if questionJp changed
            if (data.questionJp) {
                const newQuestionKey = `question.${id}.text`

                // Update with new questionKey
                const finalUpdatedQuestion = await this.questionRepository.update(id, { questionKey: newQuestionKey })
                return {
                    statusCode: 200,
                    data: finalUpdatedQuestion,
                    message: 'Cập nhật câu hỏi thành công'
                }
            }

            this.logger.log(`Updated question: ${updatedQuestion.id}`)
            return {
                statusCode: 200,
                data: updatedQuestion,
                message: 'Cập nhật câu hỏi thành công'
            }
        } catch (error) {
            this.logger.error(`Error updating question ${id}:`, error)

            if (error instanceof QuestionNotFoundException ||
                error instanceof ExercisesNotFoundException ||
                error instanceof QuestionAlreadyExistsException ||
                error instanceof InvalidJapaneseContentException) {
                throw error
            }

            throw new InvalidQuestionDataException('Lỗi khi cập nhật câu hỏi')
        }
    }
    //#endregion

    //#region Delete Question
    async deleteQuestion(id: number) {
        try {
            this.logger.log(`Deleting question ${id}`)

            // Check if question exists
            const question = await this.questionRepository.findById(id)
            if (!question) {
                throw new QuestionNotFoundException()
            }

            await this.questionRepository.delete(id)

            this.logger.log(`Deleted question ${id}`)
            return {
                statusCode: 204,
                message: 'Xóa câu hỏi thành công'
            }
        } catch (error) {
            this.logger.error(`Error deleting question ${id}:`, error)

            if (error instanceof QuestionNotFoundException) {
                throw error
            }

            if (isNotFoundPrismaError(error)) {
                throw new QuestionNotFoundException()
            }

            throw new InvalidQuestionDataException('Lỗi khi xóa câu hỏi')
        }
    }
    //#endregion

    //#region Helper Methods
    /**
     * Check if text contains Japanese characters
     */
    private isJapanese(text: string): boolean {
        // Check if text contains Japanese characters (Hiragana, Katakana, Kanji)
        const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
        return japaneseRegex.test(text)
    }

    /**
     * Get languageId from language_code
     */
    private getLanguageIdByCode(languageCode: string): number | null {
        // Hardcode language IDs (usually vi=1, en=2, ja=3)
        const languageMap: { [key: string]: number } = {
            'vi': 1,
            'en': 2,
            'ja': 3
        }
        return languageMap[languageCode] || null
    }

    /**
     * Get language_code from languageId
     */
    private getLanguageCodeById(languageId: number): string | null {
        // Hardcode language mappings (usually vi=1, en=2, ja=3)
        const languageMap: { [key: number]: string } = {
            1: 'vi',
            2: 'en',
            3: 'ja'
        }
        return languageMap[languageId] || null
    }

    /**
     * Get question with translations
     */
    private async getQuestionWithTranslations(questionId: number) {
        try {
            // Get the question
            const question = await this.questionRepository.findById(questionId)
            if (!question) {
                throw new QuestionNotFoundException()
            }

            // Get translations for this question
            let response = { ...question }

            try {
                if (!question.questionKey) {
                    // If no questionKey, return question without translations
                    return {
                        ...question,
                        translations: {
                            question: []
                        }
                    }
                }

                const translationResult = await this.translationService.findByKey({ key: question.questionKey })

                if (translationResult.translations && translationResult.translations.length > 0) {
                    // Format translations for response
                    const formattedTranslations = translationResult.translations.map(t => ({
                        language_code: this.getLanguageCodeById(t.languageId),
                        value: t.value
                    }))

                    response = {
                        ...question,
                        translations: {
                            meaning: formattedTranslations
                        }
                    } as any
                }
            } catch (translationError) {
                this.logger.warn(`Failed to fetch translations for question ${questionId}:`, translationError)
                // Continue without translations if fetching fails
            }

            return response
        } catch (error) {
            this.logger.error(`Error getting question with translations for ID ${questionId}:`, error)
            throw error
        }
    }

    /**
     * Create translation keys for question
     */
    private async createTranslationKeys(questionId: number, questionKey: string, questionJp: string, translations: { meaning: Array<{ language_code: string; value: string }> }) {
        try {
            // Create translations from provided data
            const translationPromises = translations.meaning.map(async (translation) => {
                // Get languageId from language_code
                const languageId = this.getLanguageIdByCode(translation.language_code)
                if (languageId) {
                    return this.translationService.create({
                        key: questionKey,
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
            this.logger.log(`Custom translations created for question ${questionId}: ${questionKey}`)
        } catch (error) {
            this.logger.error(`Error creating translation keys for question ${questionId}:`, error)
            throw error
        }
    }
    //#endregion
}
