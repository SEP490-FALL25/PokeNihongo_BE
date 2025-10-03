import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { KanjiRepository } from '@/modules/kanji/kanji.repo'
import { MeaningRepository } from '@/modules/meaning/meaning.repo'
import { TranslationRepository } from '@/modules/translation/translation.repo'
import { LanguagesRepository } from '@/modules/languages/languages.repo'
import { TRANSLATION_MESSAGE } from '@/common/constants/message'
import type { TranslationItemType, ExampleTranslationType, TranslationsType } from './dto/create-vocabulary-full.dto'

@Injectable()
export class VocabularyHelperService {
    private readonly logger = new Logger(VocabularyHelperService.name)

    constructor(
        private readonly prismaService: PrismaService,
        private readonly kanjiRepository: KanjiRepository,
        private readonly meaningRepository: MeaningRepository,
        private readonly translationRepository: TranslationRepository,
        private readonly languagesRepository: LanguagesRepository
    ) { }

    /**
     * Phát hiện và trích xuất các ký tự Kanji từ text tiếng Nhật
     */
    extractKanjiCharacters(text: string): string[] {
        // Regex để match các ký tự Kanji
        const kanjiRegex = /[\u4E00-\u9FAF\u3400-\u4DBF]/g
        const matches = text.match(kanjiRegex)

        // Loại bỏ trùng lặp và giữ thứ tự xuất hiện
        return matches ? Array.from(new Set(matches)) : []
    }

    /**
     * Tạo hoặc lấy Kanji đã tồn tại
     * @param character - Ký tự Kanji
     * @returns Kanji object với id
     */
    async findOrCreateKanji(character: string): Promise<{ id: number; character: string }> {
        try {
            // Kiểm tra Kanji đã tồn tại chưa
            let kanji = await this.kanjiRepository.findByCharacter(character)

            if (!kanji) {
                // Tạo Kanji mới với meaningKey tự động
                const meaningKey = `kanji.${character}.meaning`

                this.logger.log(`Creating new Kanji: ${character}`)
                kanji = await this.kanjiRepository.create({
                    character,
                    meaningKey,
                    // Có thể thêm logic để tự động lấy strokeCount và jlptLevel từ API bên ngoài
                })

                this.logger.log(`Kanji created successfully: ${character} with id ${kanji.id}`)
            }

            return kanji
        } catch (error) {
            this.logger.error(`Error finding or creating Kanji ${character}:`, error)
            throw error
        }
    }

    /**
     * Liên kết Vocabulary với các Kanji đã được tạo/tìm thấy
     * @param vocabularyId - ID của vocabulary
     * @param kanjiCharacters - Mảng các ký tự Kanji
     */
    async linkVocabularyWithKanji(vocabularyId: number, kanjiCharacters: string[]): Promise<void> {
        try {
            if (kanjiCharacters.length === 0) {
                this.logger.log(`No Kanji characters found in vocabulary ${vocabularyId}`)
                return
            }

            this.logger.log(`Linking vocabulary ${vocabularyId} with ${kanjiCharacters.length} Kanji characters`)

            // Tạo hoặc lấy tất cả Kanji
            const kanjiPromises = kanjiCharacters.map(char => this.findOrCreateKanji(char))
            const kanjis = await Promise.all(kanjiPromises)

            // Tạo các liên kết trong bảng Vocabulary_Kanji
            const linkPromises = kanjis.map((kanji, index) => {
                return this.prismaService.vocabulary_Kanji.upsert({
                    where: {
                        vocabularyId_kanjiId: {
                            vocabularyId,
                            kanjiId: kanji.id
                        }
                    },
                    create: {
                        vocabularyId,
                        kanjiId: kanji.id,
                        displayOrder: index + 1 // Thứ tự xuất hiện của Kanji
                    },
                    update: {
                        displayOrder: index + 1 // Cập nhật displayOrder nếu đã tồn tại
                    }
                })
            })

            await Promise.all(linkPromises)
            this.logger.log(`Successfully linked vocabulary ${vocabularyId} with ${kanjis.length} Kanji`)
        } catch (error) {
            this.logger.error(`Error linking vocabulary with Kanji:`, error)
            throw error
        }
    }

    /**
     * Xử lý toàn bộ quy trình: phát hiện Kanji và liên kết với Vocabulary
     * @param vocabularyId - ID của vocabulary
     * @param wordJp - Từ tiếng Nhật
     */
    async processVocabularyKanji(vocabularyId: number, wordJp: string): Promise<void> {
        try {
            // 1. Trích xuất các ký tự Kanji
            const kanjiCharacters = this.extractKanjiCharacters(wordJp)

            if (kanjiCharacters.length === 0) {
                this.logger.log(`No Kanji found in word: ${wordJp}`)
                return
            }

            this.logger.log(`Found ${kanjiCharacters.length} Kanji characters in word: ${wordJp}`)
            this.logger.log(`Kanji characters: ${kanjiCharacters.join(', ')}`)

            // 2. Liên kết Vocabulary với các Kanji
            await this.linkVocabularyWithKanji(vocabularyId, kanjiCharacters)
        } catch (error) {
            this.logger.error(`Error processing vocabulary Kanji:`, error)
            throw error
        }
    }

    /**
     * Thêm nghĩa mới cho vocabulary đã tồn tại
     * @param vocabularyId - ID của vocabulary
     * @param meaningData - Dữ liệu nghĩa mới
     */
    async addMeaningToVocabulary(
        vocabularyId: number,
        meaningData: {
            wordTypeId?: number
            exampleSentenceJp?: string
        }
    ): Promise<any> {
        try {
            // Kiểm tra vocabulary có tồn tại không
            const vocabulary = await this.prismaService.vocabulary.findUnique({
                where: { id: vocabularyId }
            })

            if (!vocabulary) {
                throw new Error(`Vocabulary with id ${vocabularyId} not found`)
            }

            // Tạo meaningKey tự động
            const existingMeaningsCount = await this.prismaService.meaning.count({
                where: { vocabularyId }
            })

            const meaningKey = `vocabulary.${vocabularyId}.meaning.${existingMeaningsCount + 1}`
            const exampleSentenceKey = meaningData.exampleSentenceJp
                ? `vocabulary.${vocabularyId}.example.${existingMeaningsCount + 1}`
                : undefined

            // Tạo meaning mới
            const meaning = await this.meaningRepository.create({
                vocabularyId,
                wordTypeId: meaningData.wordTypeId,
                meaningKey,
                exampleSentenceKey,
                exampleSentenceJp: meaningData.exampleSentenceJp
            })

            this.logger.log(`Added new meaning to vocabulary ${vocabularyId}`)
            return meaning
        } catch (error) {
            this.logger.error(`Error adding meaning to vocabulary:`, error)
            throw error
        }
    }

    /**
     * Kiểm tra vocabulary có tồn tại không (theo wordJp và reading)
     */
    async checkVocabularyExists(wordJp: string, reading: string): Promise<{ exists: boolean; vocabularyId?: number }> {
        try {
            const vocabulary = await this.prismaService.vocabulary.findFirst({
                where: {
                    wordJp,
                    reading
                },
                select: {
                    id: true
                }
            })

            return {
                exists: !!vocabulary,
                vocabularyId: vocabulary?.id
            }
        } catch (error) {
            this.logger.error(`Error checking vocabulary existence:`, error)
            throw error
        }
    }

    /**
     * Lấy languageId từ language_code
     */
    private async getLanguageId(languageCode: string): Promise<number> {
        const language = await this.languagesRepository.findByCode(languageCode)
        if (!language) {
            throw new Error(`Language with code '${languageCode}' not found. Please create it first.`)
        }
        return language.id
    }

    /**
     * Tạo vocabulary với đầy đủ translations (meanings + examples)
     * @param vocabularyData - Dữ liệu vocabulary cơ bản
     * @param translations - Object chứa meanings và examples translations
     * @param wordTypeId - ID của loại từ
     */
    async createVocabularyWithTranslations(
        vocabularyData: {
            wordJp: string
            reading: string
            levelN?: number
            audioUrl?: string
            imageUrl?: string
            createdById?: number
        },
        translations: TranslationsType,
        wordTypeId?: number
    ) {
        try {
            this.logger.log('Creating vocabulary with full translations')

            // 1. Tạo vocabulary
            const vocabulary = await this.prismaService.vocabulary.create({
                data: {
                    wordJp: vocabularyData.wordJp,
                    reading: vocabularyData.reading,
                    levelN: vocabularyData.levelN,
                    audioUrl: vocabularyData.audioUrl,
                    imageUrl: vocabularyData.imageUrl,
                    wordTypeId: wordTypeId || undefined, // Chỉ set nếu có giá trị
                    createdById: vocabularyData.createdById
                }
            })

            this.logger.log(`Vocabulary created with ID: ${vocabulary.id}`)

            // 2. Xử lý Kanji tự động
            try {
                await this.processVocabularyKanji(vocabulary.id, vocabulary.wordJp)
            } catch (kanjiError) {
                this.logger.warn(`Failed to process Kanji:`, kanjiError)
            }

            // 3. Tạo meaning với translations
            const meaningKey = `vocabulary.${vocabulary.id}.meaning.1`
            const exampleSentenceKey = translations.examples && translations.examples.length > 0
                ? `vocabulary.${vocabulary.id}.example.1`
                : undefined

            // Lấy câu ví dụ tiếng Nhật đầu tiên (nếu có)
            const exampleSentenceJp = translations.examples && translations.examples.length > 0
                ? translations.examples[0].original_sentence
                : undefined

            const meaning = await this.meaningRepository.create({
                vocabularyId: vocabulary.id,
                wordTypeId: wordTypeId || undefined, // Chỉ set nếu có giá trị
                meaningKey,
                exampleSentenceKey,
                exampleSentenceJp
            })

            this.logger.log(`Meaning created with ID: ${meaning.id}`)

            // 4. Tạo translations cho meaning (convert language_code → languageId)
            const meaningTranslations = await Promise.all(
                translations.meaning.map(async item => ({
                    languageId: await this.getLanguageId(item.language_code),
                    key: meaningKey,
                    value: item.value
                }))
            )

            // 5. Tạo translations cho examples (nếu có)
            const exampleTranslations = translations.examples && exampleSentenceKey
                ? await Promise.all(
                    translations.examples.map(async item => ({
                        languageId: await this.getLanguageId(item.language_code),
                        key: exampleSentenceKey,
                        value: item.sentence
                    }))
                )
                : []

            // 6. Bulk create tất cả translations
            const allTranslations = [...meaningTranslations, ...exampleTranslations]

            if (allTranslations.length > 0) {
                await this.prismaService.translation.createMany({
                    data: allTranslations,
                    skipDuplicates: true // Tránh lỗi nếu translation đã tồn tại
                })
                this.logger.log(`${TRANSLATION_MESSAGE.BULK_CREATE_SUCCESS}: ${allTranslations.length} records`)
            }

            // 7. Trả về vocabulary với thông tin đầy đủ
            return {
                vocabulary,
                meaning,
                translationsCreated: allTranslations.length
            }
        } catch (error) {
            this.logger.error('Error creating vocabulary with translations:', error)
            throw error
        }
    }

    /**
     * Thêm nghĩa mới với translations cho vocabulary đã tồn tại
     */
    async addMeaningWithTranslations(
        vocabularyId: number,
        translations: TranslationsType,
        wordTypeId?: number
    ) {
        try {
            this.logger.log(`Adding new meaning with translations to vocabulary ${vocabularyId}`)

            // Kiểm tra vocabulary có tồn tại không
            const vocabulary = await this.prismaService.vocabulary.findUnique({
                where: { id: vocabularyId }
            })

            if (!vocabulary) {
                throw new Error(`Vocabulary with id ${vocabularyId} not found`)
            }

            // Đếm số meanings hiện có
            const existingMeaningsCount = await this.prismaService.meaning.count({
                where: { vocabularyId }
            })

            const meaningIndex = existingMeaningsCount + 1
            const meaningKey = `vocabulary.${vocabularyId}.meaning.${meaningIndex}`
            const exampleSentenceKey = translations.examples && translations.examples.length > 0
                ? `vocabulary.${vocabularyId}.example.${meaningIndex}`
                : undefined

            const exampleSentenceJp = translations.examples && translations.examples.length > 0
                ? translations.examples[0].original_sentence
                : undefined

            // Tạo meaning mới
            const meaning = await this.meaningRepository.create({
                vocabularyId,
                wordTypeId: wordTypeId || undefined, // Chỉ set nếu có giá trị
                meaningKey,
                exampleSentenceKey,
                exampleSentenceJp
            })

            // Tạo translations cho meaning (convert language_code → languageId)
            const meaningTranslations = await Promise.all(
                translations.meaning.map(async item => ({
                    languageId: await this.getLanguageId(item.language_code),
                    key: meaningKey,
                    value: item.value
                }))
            )

            // Tạo translations cho examples (nếu có)
            const exampleTranslations = translations.examples && exampleSentenceKey
                ? await Promise.all(
                    translations.examples.map(async item => ({
                        languageId: await this.getLanguageId(item.language_code),
                        key: exampleSentenceKey,
                        value: item.sentence
                    }))
                )
                : []

            // Bulk create translations
            const allTranslations = [...meaningTranslations, ...exampleTranslations]

            if (allTranslations.length > 0) {
                await this.prismaService.translation.createMany({
                    data: allTranslations,
                    skipDuplicates: true
                })
                this.logger.log(`${TRANSLATION_MESSAGE.BULK_CREATE_SUCCESS} for new meaning: ${allTranslations.length} records`)
            }

            return {
                meaning,
                translationsCreated: allTranslations.length
            }
        } catch (error) {
            this.logger.error('Error adding meaning with translations:', error)
            throw error
        }
    }
}

