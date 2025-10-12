import {
    CreateWordTypeBodyType,
    UpdateWordTypeBodyType,
    GetWordTypeListQueryType,
    WordType
} from './entities/wordtype.entities'

import { Injectable, Logger } from '@nestjs/common'
import { WordTypeRepository } from './wordtype.repo'
import {
    WordTypeNotFoundException,
    WordTypeAlreadyExistsException,
    InvalidWordTypeDataException
} from './dto/wordtype.error'
import { TranslationService } from '@/modules/translation/translation.service'
import { LanguagesService } from '@/modules/languages/languages.service'

@Injectable()
export class WordTypeService {
    private readonly logger = new Logger(WordTypeService.name)

    constructor(
        private readonly wordTypeRepository: WordTypeRepository,
        private readonly translationService: TranslationService,
        private readonly languagesService: LanguagesService
    ) { }

    async findMany(params: GetWordTypeListQueryType) {
        try {
            this.logger.log(`Finding word types with params: ${JSON.stringify(params)}`)

            // Set default values
            const queryParams = {
                page: params.page || 1,
                limit: params.limit || 10,
                search: params.search,
                sortBy: params.sortBy as 'id' | 'createdAt' | 'updatedAt' | 'nameKey' | undefined,
                sortOrder: params.sortOrder
            }

            return await this.wordTypeRepository.findMany(queryParams)
        } catch (error) {
            this.logger.error('Error finding word types:', error)
            throw error
        }
    }

    async findById(id: number): Promise<WordType> {
        try {
            this.logger.log(`Finding word type by id: ${id}`)
            const wordType = await this.wordTypeRepository.findById(id)

            if (!wordType) {
                throw WordTypeNotFoundException
            }

            return wordType
        } catch (error) {
            this.logger.error('Error finding word type by id:', error)
            throw error
        }
    }

    async findByNameKey(nameKey: string): Promise<WordType> {
        try {
            this.logger.log(`Finding word type by name key: ${nameKey}`)
            const wordType = await this.wordTypeRepository.findByNameKey(nameKey)

            if (!wordType) {
                throw WordTypeNotFoundException
            }

            return wordType
        } catch (error) {
            this.logger.error('Error finding word type by name key:', error)
            throw error
        }
    }

    async create(data: CreateWordTypeBodyType): Promise<WordType> {
        try {
            this.logger.log(`Creating word type with nameKey: ${data.nameKey}`)

            // Kiểm tra nameKey đã tồn tại chưa
            const existingWordType = await this.wordTypeRepository.findByNameKey(data.nameKey)
            if (existingWordType) {
                throw WordTypeAlreadyExistsException
            }

            const wordType = await this.wordTypeRepository.create(data)
            this.logger.log(`Word type created successfully: ${wordType.id}`)
            return wordType
        } catch (error) {
            this.logger.error('Error creating word type:', error)
            if (error.message.includes('đã tồn tại')) {
                throw error
            }
            throw InvalidWordTypeDataException
        }
    }

    async update(id: number, data: UpdateWordTypeBodyType): Promise<WordType> {
        try {
            this.logger.log(`Updating word type: ${id}`)

            // Kiểm tra word type có tồn tại không
            const existingWordType = await this.wordTypeRepository.findById(id)
            if (!existingWordType) {
                throw WordTypeNotFoundException
            }

            // Nếu có nameKey mới, kiểm tra đã tồn tại chưa
            if (data.nameKey && data.nameKey !== existingWordType.nameKey) {
                const nameKeyExists = await this.wordTypeRepository.existsByNameKey(data.nameKey, id)
                if (nameKeyExists) {
                    throw WordTypeAlreadyExistsException
                }
            }

            const wordType = await this.wordTypeRepository.update(id, data)
            this.logger.log(`Word type updated successfully: ${wordType.id}`)
            return wordType
        } catch (error) {
            this.logger.error('Error updating word type:', error)
            if (error.message.includes('không tồn tại') || error.message.includes('đã tồn tại')) {
                throw error
            }
            throw InvalidWordTypeDataException
        }
    }

    async delete(id: number): Promise<void> {
        try {
            this.logger.log(`Deleting word type: ${id}`)

            // Kiểm tra word type có tồn tại không
            const existingWordType = await this.wordTypeRepository.findById(id)
            if (!existingWordType) {
                throw WordTypeNotFoundException
            }

            await this.wordTypeRepository.delete(id)
            this.logger.log(`Word type deleted successfully: ${id}`)
        } catch (error) {
            this.logger.error('Error deleting word type:', error)
            if (error.message.includes('không tồn tại')) {
                throw error
            }
            throw InvalidWordTypeDataException
        }
    }

    async getStats() {
        try {
            this.logger.log('Getting word type statistics')
            return await this.wordTypeRepository.getStats()
        } catch (error) {
            this.logger.error('Error getting word type statistics:', error)
            throw error
        }
    }

    /**
     * Tạo loại từ mặc định nếu chưa có
     */
    async createDefaultWordTypes(): Promise<void> {
        try {
            this.logger.log('Creating default word types')

            const defaultWordTypes = [
                // Loại từ cơ bản
                { id: 1, key: 'noun', translations: { vi: 'danh từ', en: 'noun' } },
                { id: 2, key: 'pronoun', translations: { vi: 'đại từ', en: 'pronoun' } },
                { id: 3, key: 'particle', translations: { vi: 'trợ từ', en: 'particle' } },
                { id: 4, key: 'adverb', translations: { vi: 'trạng từ', en: 'adverb' } },
                { id: 5, key: 'conjunction', translations: { vi: 'liên từ', en: 'conjunction' } },
                { id: 6, key: 'interjection', translations: { vi: 'thán từ', en: 'interjection' } },
                { id: 7, key: 'numeral', translations: { vi: 'số từ', en: 'numeral' } },
                { id: 8, key: 'counter', translations: { vi: 'lượng từ', en: 'counter' } },
                { id: 9, key: 'prefix', translations: { vi: 'tiền tố', en: 'prefix' } },
                { id: 10, key: 'suffix', translations: { vi: 'hậu tố', en: 'suffix' } },

                // Tính từ tiếng Nhật
                { id: 11, key: 'i_adjective', translations: { vi: 'tính từ i', en: 'i-adjective' } },
                { id: 12, key: 'na_adjective', translations: { vi: 'tính từ na', en: 'na-adjective' } },
                { id: 13, key: 'no_adjective', translations: { vi: 'tính từ no', en: 'no-adjective' } },

                // Động từ tiếng Nhật - các thể
                { id: 14, key: 'verb_ichidan', translations: { vi: 'động từ ichidan', en: 'ichidan verb' } },
                { id: 15, key: 'verb_godan', translations: { vi: 'động từ godan', en: 'godan verb' } },
                { id: 16, key: 'verb_irregular', translations: { vi: 'động từ bất quy tắc', en: 'irregular verb' } },
                { id: 17, key: 'verb_suru', translations: { vi: 'động từ suru', en: 'suru verb' } },
                { id: 18, key: 'verb_kuru', translations: { vi: 'động từ kuru', en: 'kuru verb' } },

                // Thể động từ
                { id: 19, key: 'verb_dict_form', translations: { vi: 'thể từ điển', en: 'dictionary form' } },
                { id: 20, key: 'verb_masu_form', translations: { vi: 'thể masu', en: 'masu form' } },
                { id: 21, key: 'verb_te_form', translations: { vi: 'thể te', en: 'te form' } },
                { id: 22, key: 'verb_ta_form', translations: { vi: 'thể ta', en: 'ta form' } },
                { id: 23, key: 'verb_ba_form', translations: { vi: 'thể ba', en: 'ba form' } },
                { id: 24, key: 'verb_potential', translations: { vi: 'thể khả năng', en: 'potential form' } },
                { id: 25, key: 'verb_passive', translations: { vi: 'thể bị động', en: 'passive form' } },
                { id: 26, key: 'verb_causative', translations: { vi: 'thể sai khiến', en: 'causative form' } },
                { id: 27, key: 'verb_causative_passive', translations: { vi: 'thể sai khiến bị động', en: 'causative passive form' } },
                { id: 28, key: 'verb_volitional', translations: { vi: 'thể ý chí', en: 'volitional form' } },
                { id: 29, key: 'verb_conditional', translations: { vi: 'thể điều kiện', en: 'conditional form' } },
                { id: 30, key: 'verb_imperative', translations: { vi: 'thể mệnh lệnh', en: 'imperative form' } },
                { id: 31, key: 'verb_prohibitive', translations: { vi: 'thể cấm', en: 'prohibitive form' } },

                // Từ đặc biệt tiếng Nhật
                { id: 32, key: 'onomatopoeia', translations: { vi: 'từ tượng thanh', en: 'onomatopoeia' } },
                { id: 33, key: 'mimetic_word', translations: { vi: 'từ tượng hình', en: 'mimetic word' } },
                { id: 34, key: 'honorific', translations: { vi: 'kính ngữ', en: 'honorific' } },
                { id: 35, key: 'humble', translations: { vi: 'khiêm nhường ngữ', en: 'humble form' } },
                { id: 36, key: 'polite', translations: { vi: 'lịch sự ngữ', en: 'polite form' } },
                { id: 37, key: 'casual', translations: { vi: 'thân mật ngữ', en: 'casual form' } }
            ]

            for (const wordType of defaultWordTypes) {
                const nameKey = `wordtype.${wordType.key}.name`
                const existing = await this.wordTypeRepository.findByNameKey(nameKey)

                if (!existing) {
                    // Tạo word type với ID cụ thể
                    await this.wordTypeRepository.create({
                        id: wordType.id,
                        nameKey
                    })
                    this.logger.log(`Created default word type with ID ${wordType.id}: ${nameKey}`)

                    // Tạo translations cho word type
                    await this.createTranslationsForWordType(nameKey, wordType.translations)
                }
            }

            this.logger.log('Default word types creation completed')
        } catch (error) {
            this.logger.error('Error creating default word types:', error)
            throw InvalidWordTypeDataException
        }
    }

    /**
     * Tạo translations cho word type
     */
    private async createTranslationsForWordType(nameKey: string, translations: Record<string, string>): Promise<void> {
        try {
            this.logger.log(`Creating translations for word type: ${nameKey}`)

            for (const [langCode, value] of Object.entries(translations)) {
                try {
                    // Tìm ngôn ngữ theo code
                    const languages = await this.languagesService.findMany({
                        page: 1,
                        limit: 100,
                        code: langCode
                    })

                    if (!languages.data?.results || languages.data.results.length === 0) {
                        this.logger.warn(`Language ${langCode} not found, skipping translation`)
                        continue
                    }

                    const language = languages.data.results[0]

                    // Kiểm tra translation đã tồn tại chưa
                    const existingTranslation = await this.translationService.findByKeyAndLanguage(
                        nameKey,
                        language.id
                    )

                    if (!existingTranslation) {
                        // Tạo translation mới
                        await this.translationService.create({
                            key: nameKey,
                            languageId: language.id,
                            value: value
                        })
                        this.logger.log(`Created translation for ${nameKey} in ${langCode}: ${value}`)
                    } else {
                        this.logger.log(`Translation already exists for ${nameKey} in ${langCode}`)
                    }
                } catch (error) {
                    this.logger.warn(`Failed to create translation for ${nameKey} in ${langCode}`, error)
                }
            }
        } catch (error) {
            this.logger.error(`Error creating translations for word type: ${nameKey}`, error)
            throw error
        }
    }
}

