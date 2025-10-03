import {
    CreateKanjiBodyType,
    UpdateKanjiBodyType,
    GetKanjiListQueryType,
    Kanji
} from './entities/kanji.entities'
import { CreateKanjiWithMeaningsBodyType } from './dto/kanji-with-meanings.dto'
import { UpdateKanjiWithMeaningsBodyType } from './dto/update-kanji-with-meanings.dto'
import { KanjiRepository } from './kanji.repo'
import { KanjiReadingService } from '@/modules/kanji-reading/kanji-reading.service'
import { TranslationService } from '@/modules/translation/translation.service'
import { LanguagesService } from '@/modules/languages/languages.service'
import { UploadService } from '@/3rdService/upload/upload.service'
import { KANJI_MESSAGE } from '@/common/constants/message'
import { Injectable, Logger } from '@nestjs/common'
import {
    KanjiNotFoundException,
    KanjiAlreadyExistsException,
    InvalidKanjiDataException
} from './dto/kanji.error'

@Injectable()
export class KanjiService {
    private readonly logger = new Logger(KanjiService.name)

    constructor(
        private readonly kanjiRepository: KanjiRepository,
        private readonly kanjiReadingService: KanjiReadingService,
        private readonly translationService: TranslationService,
        private readonly languagesService: LanguagesService,
        private readonly uploadService: UploadService
    ) { }


    // Kanji CRUD operations
    async findMany(params: GetKanjiListQueryType) {
        try {
            this.logger.log(`Finding kanji with params: ${JSON.stringify(params)}`)

            // Set default values
            const queryParams = {
                page: params.page || 1,
                limit: params.limit || 10,
                search: params.search,
                jlptLevel: params.jlptLevel,
                strokeCount: params.strokeCount,
                sortBy: params.sortBy,
                sortOrder: params.sortOrder
            }

            const result = await this.kanjiRepository.findMany(queryParams)

            return {
                data: {
                    items: result.data,
                    total: result.total,
                    page: result.page,
                    limit: result.limit
                },
                message: KANJI_MESSAGE.GET_LIST_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error finding kanji:', error)
            throw error
        }
    }

    async findById(id: number) {
        try {
            this.logger.log(`Finding kanji by id: ${id}`)
            const kanji = await this.kanjiRepository.findById(id)

            if (!kanji) {
                throw KanjiNotFoundException
            }

            return {
                data: kanji,
                message: KANJI_MESSAGE.GET_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error finding kanji by id:', error)
            throw error
        }
    }

    async findByCharacter(character: string) {
        try {
            this.logger.log(`Finding kanji by character: ${character}`)
            const kanji = await this.kanjiRepository.findByCharacter(character)

            if (!kanji) {
                throw KanjiNotFoundException
            }

            return {
                data: kanji,
                message: KANJI_MESSAGE.GET_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error finding kanji by character:', error)
            throw error
        }
    }





    async updateWithMeanings(identifier: string, data: UpdateKanjiWithMeaningsBodyType, image?: Express.Multer.File) {
        try {
            this.logger.log(`Updating kanji with meanings: ${identifier}`)

            // Kiểm tra identifier là ID (số) hay Character (chữ)
            let existingKanji
            const isNumeric = /^\d+$/.test(identifier)

            if (isNumeric) {
                // Nếu là số, tìm bằng ID
                existingKanji = await this.kanjiRepository.findById(parseInt(identifier))
            } else {
                // Nếu là chữ, tìm bằng character
                existingKanji = await this.kanjiRepository.findByCharacter(identifier)
            }

            if (!existingKanji) {
                throw KanjiNotFoundException
            }

            // Xử lý hình ảnh
            let imageUrl = existingKanji.img // Giữ lại URL hiện có
            this.logger.log(`Initial imageUrl: ${imageUrl}`)
            this.logger.log(`Image file exists: ${!!image}`)
            this.logger.log(`Data img URL: ${data.img}`)

            if (image) {
                // Nếu có file upload mới, dùng URL từ upload
                this.logger.log(`Uploading image for kanji: ${existingKanji.character}`)
                const uploadResult = await this.uploadService.uploadFile(image, 'kanji')
                imageUrl = uploadResult.url
                this.logger.log(`Image uploaded successfully: ${imageUrl}`)
            } else if (data.img) {
                // Nếu không có file upload nhưng có URL trong data, dùng URL đó
                imageUrl = data.img
                this.logger.log(`Using provided image URL: ${imageUrl}`)
            }
            // Nếu không có cả hai, giữ nguyên URL hiện có

            this.logger.log(`Final imageUrl for database: ${imageUrl}`)

            // Cập nhật kanji (không cho phép thay đổi character)
            const kanjiData = {
                strokeCount: data.strokeCount ? parseInt(data.strokeCount.toString()) : undefined,
                jlptLevel: data.jlptLevel ? parseInt(data.jlptLevel.toString()) : undefined,
                img: imageUrl
            }

            this.logger.log(`Kanji data to update: ${JSON.stringify(kanjiData)}`)

            const kanji = await this.kanjiRepository.updatePartial(existingKanji.id, kanjiData)
            this.logger.log(`Kanji updated successfully: ${kanji.id}`)

            // Tự động tạo translation cho meaningKey hiện có (nếu chưa có)
            if (existingKanji.meaningKey) {
                await this.createTranslationForMeaningKey(existingKanji.meaningKey)
            }

            // Cập nhật/tạo readings
            const readings: any[] = []
            if (data.readings && data.readings.length > 0) {
                for (const readingData of data.readings) {
                    try {
                        if (readingData.id) {
                            // Update existing reading
                            const reading = await this.kanjiReadingService.update(readingData.id, {
                                readingType: readingData.readingType,
                                reading: readingData.reading
                            })
                            readings.push(reading)
                        } else {
                            // Create new reading
                            const reading = await this.kanjiReadingService.create({
                                kanjiId: existingKanji.id,
                                readingType: readingData.readingType,
                                reading: readingData.reading
                            })
                            readings.push(reading)
                        }
                    } catch (error) {
                        this.logger.warn(`Failed to update/create reading ${readingData.readingType}: ${readingData.reading} for kanji ${existingKanji.id}`)
                    }
                }
            }

            // Cập nhật/tạo meanings
            const meanings: any[] = []
            if (data.meanings && data.meanings.length > 0) {
                for (const meaningData of data.meanings) {
                    try {
                        // Tạo translation cho meaning key
                        await this.createTranslationForMeaningKey(meaningData.meaningKey)

                        // Tạo translations cho các ngôn ngữ được cung cấp
                        if (meaningData.translations) {
                            await this.createTranslationsForLanguages(meaningData.meaningKey, meaningData.translations)
                        }

                        // Lưu thông tin meaning (không tạo trong database vì meaning thuộc về vocabulary)
                        meanings.push({
                            id: meaningData.id,
                            meaningKey: meaningData.meaningKey,
                            translations: meaningData.translations
                        })
                    } catch (error) {
                        this.logger.warn(`Failed to update/create meaning ${meaningData.meaningKey} for kanji ${existingKanji.id}`)
                    }
                }
            }

            this.logger.log(`Kanji with meanings updated successfully: ${kanji.id}`)

            return {
                data: {
                    kanji,
                    readings: readings.length > 0 ? readings : undefined,
                    meanings
                },
                message: 'Cập nhật Kanji cùng với nghĩa thành công'
            }
        } catch (error) {
            this.logger.error('Error updating kanji with meanings:', error)
            if (error.message.includes('không tồn tại') || error.message.includes('đã tồn tại')) {
                throw error
            }
            throw InvalidKanjiDataException
        }
    }


    async delete(id: number) {
        try {
            this.logger.log(`Deleting kanji: ${id}`)

            // Kiểm tra kanji có tồn tại không
            const existingKanji = await this.kanjiRepository.findById(id)
            if (!existingKanji) {
                throw KanjiNotFoundException
            }

            await this.kanjiRepository.delete(id)
            this.logger.log(`Kanji deleted successfully: ${id}`)

            return {
                message: KANJI_MESSAGE.DELETE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error deleting kanji:', error)
            if (error.message.includes('không tồn tại')) {
                throw error
            }
            throw InvalidKanjiDataException
        }
    }

    async createWithMeanings(data: CreateKanjiWithMeaningsBodyType, image?: Express.Multer.File) {
        try {
            this.logger.log(`Creating kanji with meanings: ${data.character}`)

            // Parse meanings nếu là string (từ multipart/form-data)
            if (typeof data.meanings === 'string') {
                try {
                    data.meanings = JSON.parse(data.meanings)
                    this.logger.log(`Parsed meanings from string: ${JSON.stringify(data.meanings)}`)
                } catch (error) {
                    this.logger.error('Failed to parse meanings JSON:', error)
                    throw new Error('Invalid JSON format for meanings')
                }
            }

            // Nếu meanings là object thay vì array, chuyển thành array
            if (data.meanings && !Array.isArray(data.meanings)) {
                data.meanings = [data.meanings]
                this.logger.log(`Converted meanings object to array: ${JSON.stringify(data.meanings)}`)
            }

            // Parse readings nếu là string (từ multipart/form-data)
            if (typeof data.readings === 'string') {
                this.logger.log(`Raw readings string: "${data.readings}"`)
                this.logger.log(`Readings string length: ${data.readings.length}`)

                try {
                    data.readings = JSON.parse(data.readings)
                    this.logger.log(`Parsed readings from string: ${JSON.stringify(data.readings)}`)

                    // Xử lý trường hợp readings bị stringify 2 lần
                    if (Array.isArray(data.readings)) {
                        data.readings = data.readings.map(reading => {
                            if (typeof reading === 'string') {
                                try {
                                    return JSON.parse(reading)
                                } catch (e) {
                                    return reading
                                }
                            }
                            return reading
                        })
                        this.logger.log(`Processed nested readings: ${JSON.stringify(data.readings)}`)
                    }
                } catch (error) {
                    this.logger.error('Failed to parse readings JSON:', error)
                    this.logger.error(`Problematic JSON string: "${data.readings}"`)
                    throw new Error('Invalid JSON format for readings')
                }
            }

            // Kiểm tra character đã tồn tại chưa
            const existingKanji = await this.kanjiRepository.findByCharacter(data.character)
            if (existingKanji) {
                throw KanjiAlreadyExistsException
            }

            // Upload hình ảnh nếu có
            let imageUrl = data.img
            this.logger.log(`Initial imageUrl: ${imageUrl}`)
            this.logger.log(`Image file exists: ${!!image}`)

            if (image) {
                this.logger.log(`Uploading image for kanji: ${data.character}`)
                const uploadResult = await this.uploadService.uploadFile(image, 'kanji')
                imageUrl = uploadResult.url
                this.logger.log(`Image uploaded successfully: ${imageUrl}`)
            }

            this.logger.log(`Final imageUrl for database: ${imageUrl}`)

            // Tạo kanji trước (tạm thời không có meaningKey)
            const kanjiData = {
                character: data.character,
                meaningKey: '', // Tạm thời để trống
                strokeCount: data.strokeCount ? parseInt(data.strokeCount.toString()) : undefined,
                jlptLevel: data.jlptLevel ? parseInt(data.jlptLevel.toString()) : undefined,
                img: imageUrl
            }

            this.logger.log(`Kanji data to create: ${JSON.stringify(kanjiData)}`)

            const kanji = await this.kanjiRepository.create(kanjiData)
            this.logger.log(`Kanji created successfully: ${kanji.id}`)

            // Tự động generate meaningKey bằng ID (chỉ có 1 meaning chính)
            const meaningKey = `kanji.${kanji.id}.meaning`
            this.logger.log(`Auto-generated meaningKey: ${meaningKey}`)

            // Cập nhật kanji với meaningKey đã generate
            this.logger.log(`Updating kanji with meaningKey: ${meaningKey} and img: ${imageUrl}`)
            const updatedKanji = await this.kanjiRepository.update(kanji.id, {
                meaningKey,
                img: imageUrl // Giữ lại field img
            })
            this.logger.log(`Updated kanji result: ${JSON.stringify(updatedKanji)}`)

            // Tự động tạo translation cho meaningKey chính (chỉ tạo cho vi và en)
            await this.createTranslationForMeaningKey(meaningKey)

            // Tạo các readings (nếu có)
            const readings: any[] = []
            this.logger.log(`Processing readings for kanji ${kanji.id}`)
            this.logger.log(`Data readings: ${JSON.stringify(data.readings)}`)
            this.logger.log(`Readings length: ${data.readings?.length || 0}`)

            if (data.readings && data.readings.length > 0) {
                for (let i = 0; i < data.readings.length; i++) {
                    const readingData = data.readings[i]
                    this.logger.log(`Processing reading ${i + 1}:`, readingData)

                    try {
                        // Trim spaces và validate reading data
                        const cleanReadingData = {
                            kanjiId: kanji.id,
                            readingType: readingData.readingType?.trim(),
                            reading: readingData.reading?.trim()
                        }

                        // Validate required fields
                        if (!cleanReadingData.readingType || !cleanReadingData.reading) {
                            this.logger.warn(`Skipping reading ${i + 1}: missing required fields`, readingData)
                            continue
                        }

                        const reading = await this.kanjiReadingService.create(cleanReadingData)
                        readings.push(reading)
                        this.logger.log(`Successfully created reading ${i + 1}: ${cleanReadingData.readingType} - ${cleanReadingData.reading}`)
                    } catch (error) {
                        this.logger.warn(`Failed to create reading ${readingData.readingType}: ${readingData.reading} for kanji ${kanji.id}`, error)
                    }
                }
            }

            // Xử lý meanings - chỉ lấy meaning đầu tiên và cập nhật vào meaningKey chính
            const meanings: any[] = []
            this.logger.log(`Processing meanings for kanji ${kanji.id}`)

            if (data.meanings && data.meanings.length > 0) {
                // Chỉ lấy meaning đầu tiên
                const meaningData = data.meanings[0]
                this.logger.log(`Processing main meaning:`, meaningData)

                try {
                    // Cập nhật translations cho meaningKey chính
                    if (meaningData.translations) {
                        this.logger.log(`Creating specific translations for main meaningKey: ${meaningKey}`)
                        await this.createTranslationsForLanguages(meaningKey, meaningData.translations)
                    }

                    // Lưu thông tin meaning chính
                    meanings.push({
                        meaningKey: meaningKey,
                        translations: meaningData.translations
                    })
                    this.logger.log(`Added main meaning to meanings array`)
                } catch (error) {
                    this.logger.warn(`Failed to create main meaning for kanji ${kanji.id}`)
                }
            }

            this.logger.log(`Kanji with meanings created successfully: ${kanji.id}`)

            return {
                data: {
                    kanji: updatedKanji,
                    readings: readings.length > 0 ? readings : undefined,
                    meanings
                },
                message: 'Tạo Kanji cùng với nghĩa thành công'
            }
        } catch (error) {
            this.logger.error('Error creating kanji with meanings:', error)
            if (error.message.includes('đã tồn tại')) {
                throw error
            }
            throw InvalidKanjiDataException
        }
    }

    // Tự động tạo translation cho meaningKey
    private async createTranslationForMeaningKey(meaningKey: string) {
        try {
            this.logger.log(`Creating translations for meaningKey: ${meaningKey}`)

            // Chỉ tạo translations cho 2 ngôn ngữ: Việt (vi), Anh (en)
            const targetLanguages = ['vi', 'en']

            for (const langCode of targetLanguages) {
                try {
                    // Tìm ngôn ngữ theo code
                    const languages = await this.languagesService.findMany({
                        page: 1,
                        limit: 100,
                        code: langCode
                    })

                    if (!languages.data?.items || languages.data.items.length === 0) {
                        this.logger.warn(`Language ${langCode} not found, skipping`)
                        continue
                    }

                    const language = languages.data.items[0]

                    // Kiểm tra translation đã tồn tại chưa
                    const existingTranslation = await this.translationService.findByKeyAndLanguage(
                        meaningKey,
                        language.id
                    )

                    if (existingTranslation) {
                        this.logger.log(`Translation already exists for key: ${meaningKey}, language: ${language.code}`)
                        continue
                    }

                    // Tạo translation mặc định
                    await this.translationService.create({
                        key: meaningKey,
                        languageId: language.id,
                        value: meaningKey // Tạm thời dùng key làm value, có thể cập nhật sau
                    })

                    this.logger.log(`Translation created for key: ${meaningKey}, language: ${language.code}`)
                } catch (error) {
                    this.logger.warn(`Failed to create translation for key: ${meaningKey}, language: ${langCode}`, error)
                    // Tiếp tục với ngôn ngữ khác nếu có lỗi
                }
            }
        } catch (error) {
            this.logger.error('Error creating translations for meaningKey:', error)
            // Không throw error để không ảnh hưởng đến việc tạo kanji
        }
    }

    // Tạo translations cho các ngôn ngữ cụ thể
    private async createTranslationsForLanguages(meaningKey: string, translations: Record<string, string>) {
        try {
            this.logger.log(`Creating specific translations for meaningKey: ${meaningKey}`)

            // Lấy danh sách các ngôn ngữ để map code -> id
            const languages = await this.languagesService.findMany({ page: 1, limit: 100 })

            if (!languages.data || !languages.data.items || languages.data.items.length === 0) {
                this.logger.warn('No languages found, skipping specific translation creation')
                return
            }

            // Tạo map code -> id
            const languageMap = new Map<string, number>()
            for (const language of languages.data.items) {
                languageMap.set(language.code, language.id)
            }

            // Chỉ xử lý các ngôn ngữ được hỗ trợ: vi, en
            const supportedLanguages = ['vi', 'en']

            for (const languageCode of supportedLanguages) {
                const translationValue = translations[languageCode]
                if (!translationValue) {
                    continue // Bỏ qua nếu không có translation cho ngôn ngữ này
                }

                const languageId = languageMap.get(languageCode)
                if (!languageId) {
                    this.logger.warn(`Language code ${languageCode} not found, skipping`)
                    continue
                }

                try {
                    // Kiểm tra translation đã tồn tại chưa
                    const existingTranslation = await this.translationService.findByKeyAndLanguage(
                        meaningKey,
                        languageId
                    )

                    if (existingTranslation) {
                        // Cập nhật translation hiện có
                        await this.translationService.update(existingTranslation.id, {
                            value: translationValue
                        })
                        this.logger.log(`Updated translation for key: ${meaningKey}, language: ${languageCode}`)
                    } else {
                        // Tạo translation mới
                        await this.translationService.create({
                            key: meaningKey,
                            languageId: languageId,
                            value: translationValue
                        })
                        this.logger.log(`Created translation for key: ${meaningKey}, language: ${languageCode}`)
                    }
                } catch (error) {
                    this.logger.warn(`Failed to create/update translation for key: ${meaningKey}, language: ${languageCode}`, error)
                }
            }
        } catch (error) {
            this.logger.error('Error creating specific translations:', error)
        }
    }

    // Statistics
    async getStats() {
        try {
            this.logger.log('Getting kanji statistics')
            return await this.kanjiRepository.getStats()
        } catch (error) {
            this.logger.error('Error getting kanji statistics:', error)
            throw error
        }
    }

    // Utility methods
    async getKanjiWithReadings(kanjiId: number) {
        try {
            this.logger.log(`Getting kanji with readings: ${kanjiId}`)
            const kanji = await this.kanjiRepository.findById(kanjiId)

            if (!kanji) {
                throw KanjiNotFoundException
            }

            return {
                data: kanji,
                message: KANJI_MESSAGE.GET_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error getting kanji with readings:', error)
            throw error
        }
    }

}