import {
    CreateQuestionBankBodyType,
    CreateQuestionBankWithMeaningsBodyType,
    GetQuestionBankByIdParamsType,
    GetQuestionBankListQueryType,
    UpdateQuestionBankBodyType
} from '@/modules/question-bank/entities/question-bank.entities'
import {
    InvalidQuestionBankDataException,
    QuestionBankNotFoundException
} from '@/modules/question-bank/dto/question-bank.error'
import { QUESTION_BANK_MESSAGE } from '@/common/constants/message'
import { QuestionBankRepository } from '@/modules/question-bank/question-bank.repo'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { Injectable, Logger, HttpException, ConflictException, BadRequestException } from '@nestjs/common'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { QuestionType } from '@prisma/client'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { UploadService } from '@/3rdService/upload/upload.service'
import { TranslationService } from '@/modules/translation/translation.service'
import { LanguagesService } from '@/modules/languages/languages.service'

// Custom validation functions for Japanese text
const isJapaneseText = (text: string): boolean => {
    // Japanese text contains ONLY Hiragana, Katakana, Kanji, and some punctuation
    // Must contain at least one Japanese character and no non-Japanese characters

    // Check if contains any non-Japanese characters (Latin, numbers, special chars)
    const hasNonJapanese = /[a-zA-Z0-9@#$%^&*()_+=\[\]{}|\\:";'<>?,./`~]/.test(text)

    if (hasNonJapanese) {
        return false
    }

    // Must contain at least one Japanese character (Hiragana, Katakana, Kanji)
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF\uF900-\uFAFF\u2F800-\u2FA1F]/
    const hasJapanese = japaneseRegex.test(text)

    return hasJapanese
}

// Custom error messages
const JAPANESE_TEXT_ERROR = 'Phải là văn bản tiếng Nhật thuần túy (CHỈ chứa Hiragana, Katakana, hoặc Kanji - không cho phép số hoặc ký tự Latin)'

@Injectable()
export class QuestionBankService {
    private readonly logger = new Logger(QuestionBankService.name)

    constructor(
        private readonly questionBankRepository: QuestionBankRepository,
        private readonly textToSpeechService: TextToSpeechService,
        private readonly uploadService: UploadService,
        private readonly translationService: TranslationService,
        private readonly languagesService: LanguagesService
    ) { }

    async createWithMeanings(body: CreateQuestionBankWithMeaningsBodyType, userId: number): Promise<MessageResDTO> {
        try {
            this.logger.log(`Creating question bank with meanings: ${JSON.stringify(body)}`)

            // Validate special rules based on questionType
            this.validateQuestionBankData(body)

            // Kiểm tra questionJp đã tồn tại chưa
            const questionJpExists = await this.questionBankRepository.checkQuestionJpExists(body.questionJp)
            if (questionJpExists) {
                throw new ConflictException(QUESTION_BANK_MESSAGE.ALREADY_EXISTS)
            }

            // Xử lý audioUrl - chỉ khi questionType là LISTENING thì mới tự tạo text-to-speech
            if (body.questionType === 'LISTENING' && (!body.audioUrl || body.audioUrl.trim().length === 0)) {
                body.audioUrl = await this.textToSpeechService.generateAudioFromText(body.questionJp, 'question-bank', 'question_bank')
            }

            // Tự động tạo meaningKey cho từng meaning nếu không có
            if (body.meanings && body.meanings.length > 0) {
                for (const meaning of body.meanings) {
                    if (!meaning.meaningKey || meaning.meaningKey.trim().length === 0) {
                        // Tạo meaningKey tạm thời, sẽ được cập nhật sau khi có ID
                        meaning.meaningKey = `temp.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`
                    }
                }
            }

            // Tạo question bank trước (không có questionKey)
            const questionBank = await this.questionBankRepository.createWithMeanings(body, userId)

            // Tự động tạo questionKey dựa trên ID vừa tạo
            if (!body.questionKey || body.questionKey.trim().length === 0) {
                const generatedKey = this.generateQuestionKeyFromId(questionBank.id, body.questionType)
                // Cập nhật questionKey cho question bank vừa tạo
                await this.questionBankRepository.updateQuestionKey(questionBank.id, generatedKey)
                questionBank.questionKey = generatedKey
            }

            // Cập nhật meaningKey với questionKey làm base
            if (body.meanings && body.meanings.length > 0 && questionBank.questionKey) {
                await this.updateMeaningKeys(questionBank.id, questionBank.questionKey, body.meanings)
            }

            return {
                statusCode: 201,
                data: questionBank,
                message: QUESTION_BANK_MESSAGE.CREATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error creating question bank with meanings:', error)
            if (error instanceof HttpException || error.message?.includes('đã tồn tại') || error.message?.includes('không tồn tại')) {
                throw error
            }
            throw InvalidQuestionBankDataException
        }
    }

    private validateQuestionBankData(body: CreateQuestionBankWithMeaningsBodyType): void {
        // Rule 1: questionJp must be valid Japanese text
        if (body.questionJp && !isJapaneseText(body.questionJp)) {
            throw new BadRequestException(JAPANESE_TEXT_ERROR)
        }

        // Rule 2: SPEAKING - pronunciation is required
        if (body.questionType === 'SPEAKING' && (!body.pronunciation || body.pronunciation.trim().length === 0)) {
            throw new BadRequestException('SPEAKING type bắt buộc phải có pronunciation (cách phát âm romaji)')
        }

        // Rule 3: LISTENING - audioUrl must be a valid URL if provided
        if (body.questionType === 'LISTENING' && body.audioUrl && body.audioUrl.trim().length > 0) {
            try {
                new URL(body.audioUrl)
            } catch {
                throw new BadRequestException('audioUrl phải là một URL hợp lệ')
            }
        }
    }


    async findAll(query: GetQuestionBankListQueryType, lang: string = 'vi'): Promise<MessageResDTO> {
        const { data, total } = await this.questionBankRepository.findMany(query)
        const { currentPage, pageSize } = query
        const totalPage = Math.ceil(total / pageSize)

        // Resolve translation values for questionKey per requested language
        let languageId: number | undefined
        try {
            const language = await this.languagesService.findByCode({ code: lang })
            languageId = language?.data?.id
        } catch {
            languageId = undefined
        }

        const resultsWithMeaning = await Promise.all(
            data.map(async (item) => {
                // Sử dụng trực tiếp questionKey để tìm translation
                if (!item.questionKey) {
                    const { questionKey, ...itemWithoutQuestionKey } = item
                    return {
                        ...itemWithoutQuestionKey,
                        meaning: null
                    }
                }

                try {
                    const translations = await this.translationService.findByKey({ key: item.questionKey })

                    if (translations && translations.translations && translations.translations.length > 0) {
                        // Get Vietnamese meaning first, fallback to first available
                        const viTranslation = translations.translations.find(t => {
                            return t.languageId === 1 // Assuming Vietnamese is languageId 1
                        })
                        const meaning = viTranslation?.value || translations.translations[0]?.value || ''
                        const { questionKey, ...itemWithoutQuestionKey } = item
                        return {
                            ...itemWithoutQuestionKey,
                            meaning
                        }
                    } else {
                        const { questionKey, ...itemWithoutQuestionKey } = item
                        return {
                            ...itemWithoutQuestionKey,
                            meaning: null
                        }
                    }
                } catch (error) {
                    this.logger.warn(`Failed to get meaning for question ${item.id}:`, error)
                    const { questionKey, ...itemWithoutQuestionKey } = item
                    return {
                        ...itemWithoutQuestionKey,
                        meaning: null
                    }
                }
            })
        )

        return {
            statusCode: 200,
            data: {
                results: resultsWithMeaning,
                pagination: {
                    current: currentPage,
                    pageSize: pageSize,
                    totalPage: totalPage,
                    totalItem: total,
                },
            },
            message: QUESTION_BANK_MESSAGE.GET_LIST_SUCCESS,
        }
    }

    async findOne(id: number): Promise<MessageResDTO> {
        const questionBank = await this.questionBankRepository.findById(id)

        if (!questionBank) {
            throw QuestionBankNotFoundException
        }

        return {
            statusCode: 200,
            data: questionBank,
            message: QUESTION_BANK_MESSAGE.GET_SUCCESS
        }
    }

    async update(id: number, body: UpdateQuestionBankBodyType): Promise<MessageResDTO> {
        try {
            const questionBank = await this.questionBankRepository.update(id, body)

            return {
                statusCode: 200,
                data: questionBank,
                message: QUESTION_BANK_MESSAGE.UPDATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error updating question bank:', error)
            if (error instanceof HttpException || error.message?.includes('không tồn tại') || error.message?.includes('đã tồn tại')) {
                throw error
            }
            throw InvalidQuestionBankDataException
        }
    }

    async remove(id: number): Promise<MessageResDTO> {
        try {
            const questionBank = await this.questionBankRepository.delete(id)

            return {
                statusCode: 200,
                data: questionBank,
                message: QUESTION_BANK_MESSAGE.DELETE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error deleting question bank:', error)
            if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
                throw error
            }
            throw InvalidQuestionBankDataException
        }
    }

    async getStatistics(): Promise<MessageResDTO> {
        const statistics = await this.questionBankRepository.getStatistics()

        return {
            statusCode: 200,
            data: statistics,
            message: 'Lấy thống kê câu hỏi thành công'
        }
    }

    async findByQuestionType(questionType: QuestionType): Promise<MessageResDTO> {
        const questions = await this.questionBankRepository.findByQuestionType(questionType)

        return {
            statusCode: 200,
            data: questions,
            message: 'Lấy câu hỏi theo loại thành công'
        }
    }

    async findByLevelN(levelN: number): Promise<MessageResDTO> {
        const questions = await this.questionBankRepository.findByLevelN(levelN)

        return {
            statusCode: 200,
            data: questions,
            message: 'Lấy câu hỏi theo cấp độ thành công'
        }
    }

    async findByTestSetId(testSetId: number): Promise<MessageResDTO> {
        try {
            const questionBanks = await this.questionBankRepository.findByTestSetId(testSetId)

            return {
                statusCode: 200,
                data: {
                    results: questionBanks
                },
                message: QUESTION_BANK_MESSAGE.GET_LIST_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error finding question banks by test set ID:', error)
            if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
                throw error
            }
            throw InvalidQuestionBankDataException
        }
    }

    /**
     * Tự động tạo questionKey theo mẫu: {questionType}.{ID}.question
     */
    private generateQuestionKeyFromId(id: number, questionType: string): string {
        return `${questionType}.${id}.question`
    }

    /**
     * Cập nhật meaningKey với questionKey làm base
     */
    private async updateMeaningKeys(questionBankId: number, questionKey: string, meanings: Array<{ meaningKey?: string | null, translations: Record<string, string> }>): Promise<void> {
        for (let i = 0; i < meanings.length; i++) {
            const meaning = meanings[i]
            // Sử dụng questionKey làm base: VOCABULARY.5.question -> question.VOCABULARY.5.meaning.1
            const finalMeaningKey = `question.${questionKey.replace('.question', `.meaning.${i + 1}`)}`

            // Cập nhật translations với meaningKey mới (chỉ nếu có meaningKey cũ)
            if (meaning.meaningKey) {
                await this.questionBankRepository.updateTranslationKeys(meaning.meaningKey, finalMeaningKey)
            }

            // Cập nhật meaningKey trong array
            meaning.meaningKey = finalMeaningKey
        }
    }
}