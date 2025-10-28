import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { QuestionType } from '@prisma/client'
import {
    CreateAnswerBodyType,
    CreateMultipleAnswersBodyType,
    UpdateAnswerBodyType,
    GetAnswerByIdParamsType,
    GetAnswerListQueryType,
    CreateMultipleAnswersResponseType
} from './entities/answer.entities'
import {
    AnswerNotFoundException,
    AnswerAlreadyExistsException,
    InvalidAnswerDataException,
    QuestionNotFoundException,
    AnswerContentAlreadyExistsException,
    InvalidJapaneseContentException,
} from './dto/answer.error'
import { AnswerRepository } from './answer.repo'
import { TranslationService } from '@/modules/translation/translation.service'
import { LanguagesService } from '@/modules/languages/languages.service'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'

@Injectable()
export class AnswerService {
    private readonly logger = new Logger(AnswerService.name)

    constructor(
        private readonly answerRepository: AnswerRepository,
        private readonly translationService: TranslationService,
        private readonly languagesService: LanguagesService,
    ) { }

    //#region Get Answer
    async getAnswerList(params: GetAnswerListQueryType) {
        try {
            this.logger.log('Getting answer list with params:', params)

            const result = await this.answerRepository.findMany(params)

            // Resolve language (query param takes precedence over I18n header)
            const requestedLanguageCode = params.language

            // Get language ID for translations
            let languageId: number | undefined
            if (requestedLanguageCode) {
                try {
                    const language = await this.languagesService.findByCode({ code: requestedLanguageCode })
                    languageId = language?.data?.id
                } catch {
                    languageId = undefined
                }
            } else {
                languageId = undefined
            }

            // Add translations for each answer (match Question Bank behavior)
            const resultsWithTranslations = await Promise.all(
                result.items.map(async (answer) => {
                    // If language specified -> return single meaning
                    if (languageId) {
                        try {
                            if (!answer.answerKey) {
                                const { answerKey, ...answerWithoutKey } = answer
                                return {
                                    ...answerWithoutKey,
                                    meaning: answer.answerJp || ''
                                }
                            }

                            const translationResult = await this.translationService.findByKeyAndLanguage(
                                answer.answerKey,
                                languageId as number
                            )
                            const meaning = translationResult?.value || answer.answerJp || ''

                            const { answerKey, ...answerWithoutKey } = answer
                            return {
                                ...answerWithoutKey,
                                meaning
                            }
                        } catch {
                            const { answerKey, ...answerWithoutKey } = answer
                            return {
                                ...answerWithoutKey,
                                meaning: ''
                            }
                        }
                    }

                    // If no language specified -> return all meanings
                    try {
                        if (!answer.answerKey) {
                            const { answerKey, ...answerWithoutKey } = answer
                            return {
                                ...answerWithoutKey,
                                meanings: []
                            }
                        }

                        const translationResult = await this.translationService.findByKey({ key: answer.answerKey })
                        const meanings = translationResult.translations && translationResult.translations.length > 0
                            ? translationResult.translations.map(t => ({
                                language: this.getLanguageCodeById(t.languageId),
                                value: t.value
                            }))
                            : []

                        const { answerKey, ...answerWithoutKey } = answer
                        return {
                            ...answerWithoutKey,
                            meanings
                        }
                    } catch {
                        const { answerKey, ...answerWithoutKey } = answer
                        return {
                            ...answerWithoutKey,
                            meanings: []
                        }
                    }
                })
            )

            this.logger.log(`Found ${result.items.length} answer entries`)
            return {
                statusCode: 200,
                message: 'Lấy danh sách câu trả lời thành công',
                data: {
                    results: resultsWithTranslations,
                    pagination: {
                        current: result.page,
                        pageSize: result.limit,
                        totalPage: Math.ceil(result.total / result.limit),
                        totalItem: result.total
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error getting answer list:', error)
            throw error
        }
    }

    async getAnswerById(id: number, lang: string) {
        try {
            this.logger.log(`Getting answer by id: ${id}`)

            const answer = await this.answerRepository.findById(id)

            if (!answer) {
                throw new AnswerNotFoundException()
            }

            // Resolve language id from I18n lang for meaning
            let meaning: string
            try {
                if (lang && answer.answerKey) {
                    const language = await this.languagesService.findByCode({ code: lang })
                    const languageId = language?.data?.id
                    if (languageId) {
                        const translationResult = await this.translationService.findByKeyAndLanguage(
                            answer.answerKey,
                            languageId
                        )
                        meaning = (translationResult?.value ?? answer.answerJp) ?? ''
                    } else {
                        meaning = answer.answerJp ?? ''
                    }
                } else {
                    meaning = answer.answerJp ?? ''
                }
            } catch {
                meaning = answer.answerJp ?? ''
            }

            // Build meanings array (all languages) if answerKey exists
            let meanings: Array<{ language_code: string; value: string }> | undefined
            try {
                if (answer.answerKey) {
                    const translationResultAll = await this.translationService.findByKey({ key: answer.answerKey })
                    meanings = (translationResultAll.translations || []).map(t => ({
                        language_code: this.getLanguageCodeById(t.languageId) || '',
                        value: t.value ?? ''
                    }))
                }
            } catch {
                meanings = undefined
            }

            this.logger.log(`Found answer: ${answer.id}`)
            const { answerKey, ...answerWithoutKey } = answer as any
            return {
                statusCode: 200,
                data: {
                    ...answerWithoutKey,
                    meaning,
                    ...(meanings && meanings.length > 0 ? { meanings } : {})
                } as any,
                message: 'Lấy thông tin câu trả lời thành công'
            }
        } catch (error) {
            this.logger.error(`Error getting answer by id ${id}:`, error)

            if (error instanceof AnswerNotFoundException) {
                throw error
            }

            throw new InvalidAnswerDataException('Lỗi khi lấy thông tin câu trả lời')
        }
    }
    //#endregion

    //#region Create Answer
    async createAnswer(data: CreateAnswerBodyType) {
        try {
            this.logger.log('Creating answer with data:', data)

            // Validate Japanese content
            if (!this.isJapanese(data.answerJp)) {
                throw new InvalidJapaneseContentException()
            }

            // Check if question exists
            const questionExists = await this.answerRepository.checkQuestionExists(data.questionBankId)
            if (!questionExists) {
                throw new QuestionNotFoundException()
            }

            // Get question type for validation
            const questionType = await this.answerRepository.getQuestionType(data.questionBankId)

            // Validate MATCHING type: only 1 answer allowed and must be correct
            if (questionType === QuestionType.MATCHING) {
                const existingAnswerCount = await this.answerRepository.countAnswersByQuestionId(data.questionBankId)
                if (existingAnswerCount >= 1) {
                    throw new BadRequestException('MATCHING type chỉ cho phép tạo 1 answer duy nhất')
                }
                // MATCHING type answer must be correct
                if (!data.isCorrect) {
                    throw new BadRequestException('MATCHING type bắt buộc phải có isCorrect = true')
                }
            } else {
                // Other types: max 4 answers, only 1 can be correct
                const existingAnswerCount = await this.answerRepository.countAnswersByQuestionId(data.questionBankId)
                if (existingAnswerCount >= 4) {
                    throw new BadRequestException('Mỗi câu hỏi chỉ được tạo tối đa 4 câu trả lời')
                }

                // Check if there's already a correct answer
                if (data.isCorrect) {
                    const hasCorrectAnswer = await this.answerRepository.hasCorrectAnswer(data.questionBankId)
                    if (hasCorrectAnswer) {
                        throw new BadRequestException('Mỗi câu hỏi chỉ được có 1 câu trả lời đúng')
                    }
                }
            }

            // Check if answer content already exists in this question
            const existingAnswer = await this.answerRepository.checkAnswerExists(data.questionBankId, data.answerJp)
            if (existingAnswer) {
                throw new AnswerContentAlreadyExistsException()
            }

            // Remove translations from data before passing to Prisma
            const { translations, ...answerData } = data

            // Create answer with auto-generated answerKey
            const tempData = { ...answerData, answerKey: 'temp' }
            const answer = await this.answerRepository.create(tempData)

            // Generate answerKey with actual ID
            const answerKey = `answer.${answer.id}.text`

            // Update with correct answerKey
            const updatedAnswer = await this.answerRepository.update(answer.id, { answerKey } as any)

            // Create translation keys if provided
            if (translations) {
                try {
                    // Check if it's simple format (direct object) or complex format (with meaning array)
                    if ('language_code' in translations && 'value' in translations) {
                        // Simple format: { language_code: "vi", value: "text" }
                        const languageId = this.getLanguageIdByCode(translations.language_code)
                        if (languageId) {
                            await this.translationService.create({
                                key: answerKey,
                                languageId: languageId,
                                value: translations.value
                            })
                            this.logger.log(`Created simple translation for answer: ${answer.id}`)
                        }
                    } else if ('meaning' in translations && translations.meaning && translations.meaning.length > 0) {
                        // Complex format: { meaning: [{ language_code: "vi", value: "text" }] }
                        await this.createTranslationKeys(answer.id, answerKey, data.answerJp, translations)
                        this.logger.log(`Translation keys created for answer: ${answer.id}`)
                    }
                } catch (translationError) {
                    this.logger.warn(`Failed to create translation for answer ${answer.id}:`, translationError)
                    // Don't throw error as answer was created successfully
                }
            } else {
                // Create default Vietnamese translation if no translations provided
                try {
                    await this.translationService.create({
                        key: answerKey,
                        languageId: 1, // Vietnamese
                        value: data.answerJp
                    })
                    this.logger.log(`Created default Vietnamese translation for answer: ${answer.id}`)
                } catch (translationError) {
                    this.logger.warn(`Failed to create default translation for answer ${answer.id}:`, translationError)
                }
            }

            // Fetch the answer with translations for response
            const answerWithTranslations = await this.getAnswerWithTranslations(updatedAnswer.id)

            this.logger.log(`Created answer: ${updatedAnswer.id}`)
            return {
                statusCode: 201,
                data: answerWithTranslations,
                message: 'Tạo câu trả lời thành công'
            }
        } catch (error) {
            this.logger.error('Error creating answer:', error)

            if (error instanceof QuestionNotFoundException ||
                error instanceof AnswerAlreadyExistsException ||
                error instanceof AnswerContentAlreadyExistsException ||
                error instanceof InvalidJapaneseContentException ||
                error instanceof BadRequestException) {
                throw error
            }

            if (isUniqueConstraintPrismaError(error)) {
                throw new AnswerAlreadyExistsException()
            }

            throw new InvalidAnswerDataException('Lỗi khi tạo câu trả lời')
        }
    }
    //#endregion

    //#region Update Answer
    async updateAnswer(id: number, data: UpdateAnswerBodyType) {
        try {
            this.logger.log(`Updating answer ${id} with data:`, data)

            // Check if answer exists
            const answer = await this.answerRepository.findById(id)
            if (!answer) {
                throw new AnswerNotFoundException()
            }

            // Check if question exists (if updating questionBankId)
            if (data.questionBankId) {
                const questionExists = await this.answerRepository.checkQuestionExists(data.questionBankId)
                if (!questionExists) {
                    throw new QuestionNotFoundException()
                }
            }

            // Prepare Prisma-safe data: map questionId -> questionBankId, strip translations
            const { translations, questionId, ...rest } = data as any
            const prismaData: any = { ...rest }
            if (questionId) {
                prismaData.questionBankId = questionId
            }

            // Update answer first (without translations)
            const updatedAnswer = await this.answerRepository.update(id, prismaData)

            // Generate new answerKey if answerJp changed
            let currentAnswerKey = updatedAnswer.answerKey || `answer.${id}.text`
            if (data.answerJp) {
                const newAnswerKey = `answer.${id}.text`

                // Update with new answerKey
                const finalUpdatedAnswer = await this.answerRepository.update(id, { answerKey: newAnswerKey } as any)
                currentAnswerKey = newAnswerKey
                // continue to translation update below
            }

            // Upsert translations if provided
            if (translations && 'meaning' in translations && (translations as any).meaning?.length > 0) {
                for (const m of (translations as any).meaning) {
                    const languageId = this.getLanguageIdByCode(m.language_code)
                    if (!languageId) continue
                    try {
                        const existing = await this.translationService.findByKeyAndLanguage(currentAnswerKey, languageId)
                        if (existing) {
                            await this.translationService.updateByKeyAndLanguage(currentAnswerKey, languageId, { value: m.value })
                        } else {
                            await this.translationService.create({ key: currentAnswerKey, languageId, value: m.value })
                        }
                    } catch (e) {
                        this.logger.warn(`Failed to upsert translation for answer ${id} ${m.language_code}`, e as any)
                    }
                }
            }

            this.logger.log(`Updated answer: ${updatedAnswer.id}`)
            return {
                statusCode: 200,
                data: { ...updatedAnswer, answerKey: currentAnswerKey },
                message: 'Cập nhật câu trả lời thành công'
            }
        } catch (error) {
            this.logger.error(`Error updating answer ${id}:`, error)

            if (error instanceof AnswerNotFoundException ||
                error instanceof QuestionNotFoundException ||
                error instanceof AnswerAlreadyExistsException) {
                throw error
            }

            throw new InvalidAnswerDataException('Lỗi khi cập nhật câu trả lời')
        }
    }
    //#endregion

    //#region Delete Answer
    async deleteAnswer(id: number) {
        try {
            this.logger.log(`Deleting answer ${id}`)

            // Check if answer exists
            const answer = await this.answerRepository.findById(id)
            if (!answer) {
                throw new AnswerNotFoundException()
            }

            await this.answerRepository.delete(id)

            this.logger.log(`Deleted answer ${id}`)
            return {
                statusCode: 204,
                message: 'Xóa câu trả lời thành công'
            }
        } catch (error) {
            this.logger.error(`Error deleting answer ${id}:`, error)

            if (error instanceof AnswerNotFoundException) {
                throw error
            }

            if (isNotFoundPrismaError(error)) {
                throw new AnswerNotFoundException()
            }

            throw new InvalidAnswerDataException('Lỗi khi xóa câu trả lời')
        }
    }
    //#endregion

    //#region Helper Methods
    /**
     * Check if text contains Japanese characters
     */
    private isJapanese(text: string): boolean {
        const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
        return japaneseRegex.test(text)
    }

    /**
     * Get language ID from language code
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
     * Create translation keys for answer
     */
    private async createTranslationKeys(answerId: number, answerKey: string, answerJp: string, translations: { meaning: Array<{ language_code: string; value: string }> }) {
        try {
            // Create translations from provided data
            const translationPromises = translations.meaning.map(async (translation) => {
                // Get languageId from language_code
                const languageId = this.getLanguageIdByCode(translation.language_code)
                if (languageId) {
                    return this.translationService.create({
                        key: answerKey,
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
            this.logger.log(`Custom translations created for answer ${answerId}: ${answerKey}`)
        } catch (error) {
            this.logger.error(`Error creating translation keys for answer ${answerId}:`, error)
            throw error
        }
    }

    /**
     * Get answer with translations
     */
    private async getAnswerWithTranslations(answerId: number) {
        try {
            // Get the answer
            const answer = await this.answerRepository.findById(answerId)
            if (!answer) {
                throw new AnswerNotFoundException()
            }

            // Get translations for this answer
            let response = { ...answer }

            try {
                if (!answer.answerKey) {
                    // If no answerKey, return answer without translations
                    return {
                        ...answer,
                        translations: {
                            answer: []
                        }
                    }
                }

                const translationResult = await this.translationService.findByKey({ key: answer.answerKey })

                if (translationResult.translations && translationResult.translations.length > 0) {
                    // Format translations for response
                    const formattedTranslations = translationResult.translations.map(t => ({
                        language_code: this.getLanguageCodeById(t.languageId),
                        value: t.value
                    }))

                    response = {
                        ...answer,
                        translations: {
                            meaning: formattedTranslations
                        }
                    } as any
                }
            } catch (translationError) {
                this.logger.warn(`Failed to fetch translations for answer ${answerId}:`, translationError)
                // Continue without translations if fetching fails
            }

            return response
        } catch (error) {
            this.logger.error(`Error getting answer with translations for ID ${answerId}:`, error)
            throw error
        }
    }

    async createMultiple(data: CreateMultipleAnswersBodyType): Promise<CreateMultipleAnswersResponseType> {
        try {
            this.logger.log(`Creating multiple answers for questionBankId: ${data.questionBankId}`)

            // Check if question exists
            const questionExists = await this.answerRepository.checkQuestionExists(data.questionBankId)
            if (!questionExists) {
                throw new QuestionNotFoundException()
            }

            // Get question type for validation
            const questionType = await this.answerRepository.getQuestionType(data.questionBankId)

            const createdAnswers: any[] = []
            const failedAnswers: { answerJp: string; reason: string }[] = []

            for (const answerData of data.answers) {
                try {
                    // Validate Japanese content
                    if (!this.isJapanese(answerData.answerJp)) {
                        failedAnswers.push({
                            answerJp: answerData.answerJp,
                            reason: 'Nội dung câu trả lời phải là tiếng Nhật'
                        })
                        continue
                    }

                    // Validate MATCHING type: only 1 answer allowed and must be correct
                    if (questionType === QuestionType.MATCHING) {
                        const existingAnswerCount = await this.answerRepository.countAnswersByQuestionId(data.questionBankId)
                        if (existingAnswerCount >= 1) {
                            failedAnswers.push({
                                answerJp: answerData.answerJp,
                                reason: 'MATCHING type chỉ cho phép tạo 1 answer duy nhất'
                            })
                            continue
                        }
                        // MATCHING type answer must be correct
                        if (!answerData.isCorrect) {
                            failedAnswers.push({
                                answerJp: answerData.answerJp,
                                reason: 'MATCHING type bắt buộc phải có isCorrect = true'
                            })
                            continue
                        }
                    } else {
                        // Other types: max 4 answers, only 1 can be correct
                        const existingAnswerCount = await this.answerRepository.countAnswersByQuestionId(data.questionBankId)
                        if (existingAnswerCount >= 4) {
                            failedAnswers.push({
                                answerJp: answerData.answerJp,
                                reason: 'Mỗi câu hỏi chỉ được tạo tối đa 4 câu trả lời'
                            })
                            continue
                        }

                        // Check if there's already a correct answer
                        if (answerData.isCorrect) {
                            const hasCorrectAnswer = await this.answerRepository.hasCorrectAnswer(data.questionBankId)
                            if (hasCorrectAnswer) {
                                failedAnswers.push({
                                    answerJp: answerData.answerJp,
                                    reason: 'Mỗi câu hỏi chỉ được có 1 câu trả lời đúng'
                                })
                                continue
                            }
                        }
                    }

                    // Check if answer content already exists in this question
                    const existingAnswer = await this.answerRepository.checkAnswerExists(data.questionBankId, answerData.answerJp)
                    if (existingAnswer) {
                        failedAnswers.push({
                            answerJp: answerData.answerJp,
                            reason: 'Câu trả lời đã tồn tại cho câu hỏi này'
                        })
                        continue
                    }

                    // Create answer with auto-generated answerKey
                    const tempData = { ...answerData, questionBankId: data.questionBankId, answerKey: 'temp' }
                    const answer = await this.answerRepository.create(tempData)

                    // Generate answerKey with actual ID
                    const answerKey = `answer.${answer.id}.text`
                    await this.answerRepository.updateAnswerKey(answer.id, answerKey)
                    answer.answerKey = answerKey

                    // Create translations
                    if (answerData.translations && 'meaning' in answerData.translations && answerData.translations.meaning && answerData.translations.meaning.length > 0) {
                        await this.createTranslationKeys(answer.id, answerKey, answer.answerJp || '', answerData.translations)
                    } else {
                        // Create default Vietnamese translation if none provided
                        try {
                            await this.translationService.create({
                                key: answerKey,
                                languageId: 1, // Vietnamese
                                value: answer.answerJp || ''
                            })
                        } catch (translationError) {
                            this.logger.warn(`Failed to create default translation for answer ${answer.id}:`, translationError)
                        }
                    }

                    const answerWithTranslations = await this.answerRepository.findById(answer.id)
                    if (answerWithTranslations) {
                        createdAnswers.push(answerWithTranslations)
                    }

                } catch (error: any) {
                    this.logger.error(`Error creating answer "${answerData.answerJp}":`, error)
                    failedAnswers.push({
                        answerJp: answerData.answerJp,
                        reason: error?.message || 'Lỗi không xác định khi tạo câu trả lời'
                    })
                }
            }

            const total = data.answers.length
            const success = createdAnswers.length
            const failed = failedAnswers.length

            let statusCode = 201
            let message = `Tạo thành công ${success}/${total} câu trả lời`

            if (success === 0) {
                statusCode = 400
                message = 'Không thể tạo câu trả lời nào'
            } else if (failed > 0) {
                statusCode = 207 // Multi-status
                message = `Tạo thành công ${success}/${total} câu trả lời`
            }

            return {
                statusCode,
                data: {
                    created: createdAnswers,
                    failed: failedAnswers,
                    summary: {
                        total,
                        success,
                        failed
                    }
                },
                message
            }

        } catch (error) {
            this.logger.error('Error creating multiple answers:', error)
            if (error instanceof QuestionNotFoundException) {
                throw error
            }
            throw new InvalidAnswerDataException('Lỗi khi tạo nhiều câu trả lời')
        }
    }
    //#endregion
}
