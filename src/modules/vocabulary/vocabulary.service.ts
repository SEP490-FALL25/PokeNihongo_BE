import {
    CreateVocabularyBodyType,
    GetVocabularyByIdParamsType,
    GetVocabularyListQueryType,
    UpdateVocabularyBodyType,
    VocabularyType
} from '@/modules/vocabulary/entities/vocabulary.entities'
import { CreateVocabularyAdvancedDTO, VocabularyAdvancedResponseDTO } from '@/modules/vocabulary/dto/vocabulary.dto'
import {
    InvalidVocabularyDataException,
    VocabularyAlreadyExistsException,
    VocabularyNotFoundException
} from '@/modules/vocabulary/dto/vocabulary.error'
import { VocabularyRepository } from '@/modules/vocabulary/vocabulary.repo'
import { VocabularyHelperService } from '@/modules/vocabulary/vocabulary.helper.service'
import { VOCABULARY_MESSAGE } from '@/common/constants/message'
import { UploadService } from '@/3rdService/upload/upload.service'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class VocabularyService {
    private readonly logger = new Logger(VocabularyService.name)

    constructor(
        private readonly vocabularyRepository: VocabularyRepository,
        private readonly uploadService: UploadService,
        private readonly textToSpeechService: TextToSpeechService,
        private readonly vocabularyHelperService: VocabularyHelperService
    ) { }

    // Removed old create method - use createFullVocabularyWithFiles instead

    //#region Find All
    async findAll(query: GetVocabularyListQueryType) {
        const { page, limit, search, wordJp, reading } = query

        const result = await this.vocabularyRepository.findMany({
            page,
            limit,
            search,
            wordJp,
            reading
        })

        return {
            data: result,
            message: VOCABULARY_MESSAGE.GET_LIST_SUCCESS
        }
    }
    //#endregion

    //#region Find One
    async findOne(params: GetVocabularyByIdParamsType) {
        const vocabulary = await this.vocabularyRepository.findUnique({
            id: params.id
        })

        if (!vocabulary) {
            throw VocabularyNotFoundException
        }

        return {
            data: vocabulary,
            message: VOCABULARY_MESSAGE.GET_SUCCESS
        }
    }

    async findByWordJp(wordJp: string) {
        const vocabulary = await this.vocabularyRepository.findFirst({
            wordJp
        })

        if (!vocabulary) {
            return null
        }

        return {
            data: vocabulary,
            message: VOCABULARY_MESSAGE.GET_SUCCESS
        }
    }
    //#endregion

    //#region Update
    async update(
        id: number,
        body: UpdateVocabularyBodyType,
        imageFile?: Express.Multer.File,
        audioFile?: Express.Multer.File,
        regenerateAudio?: boolean
    ) {
        try {
            // Get existing vocabulary to get old URLs
            const existingVocabulary = await this.vocabularyRepository.findUnique({ id })
            if (!existingVocabulary) {
                throw VocabularyNotFoundException
            }

            // Upload new files if provided and get URLs
            const uploadResults = await this.uploadVocabularyFiles(
                imageFile,
                audioFile,
                existingVocabulary.imageUrl || undefined,
                existingVocabulary.audioUrl || undefined
            )

            let finalAudioUrl = uploadResults.data.audioUrl || existingVocabulary.audioUrl

            // If no audio file uploaded AND regenerateAudio=true → Gen new audio using TTS
            if (!audioFile && regenerateAudio && body.wordJp) {
                this.logger.log('Regenerating audio using TTS...')
                try {
                    const ttsResult = await this.textToSpeechService.convertTextToSpeech(
                        body.wordJp,
                        { languageCode: 'ja-JP', audioEncoding: 'MP3' }
                    )

                    const audioBuffer = ttsResult.audioContent
                    const fileName = `vocabulary_${body.wordJp}_${Date.now()}.mp3`

                    const generatedAudioFile: Express.Multer.File = {
                        buffer: audioBuffer,
                        originalname: fileName,
                        mimetype: 'audio/mpeg',
                        fieldname: 'audioFile',
                        encoding: '7bit',
                        size: audioBuffer.length,
                        stream: null as any,
                        destination: '',
                        filename: fileName,
                        path: ''
                    }

                    const uploadResult = await this.uploadService.uploadFile(generatedAudioFile, 'vocabulary/audio')
                    finalAudioUrl = uploadResult.url
                    this.logger.log(`Audio regenerated via TTS: ${finalAudioUrl}`)
                } catch (ttsError) {
                    this.logger.warn('Failed to regenerate audio using TTS:', ttsError)
                }
            }

            // Update vocabulary with new URLs
            const updateData = {
                ...body,
                imageUrl: uploadResults.data.imageUrl || existingVocabulary.imageUrl,
                audioUrl: finalAudioUrl
            }

            // If wordJp is being updated, check for duplicates
            if (updateData.wordJp && updateData.wordJp !== existingVocabulary.wordJp) {
                const duplicateVocabulary = await this.vocabularyRepository.findFirst({
                    wordJp: updateData.wordJp
                })
                if (duplicateVocabulary && duplicateVocabulary.id !== id) {
                    throw VocabularyAlreadyExistsException
                }
            }

            const vocabulary = await this.vocabularyRepository.update({ id }, {
                ...updateData,
                imageUrl: updateData.imageUrl || undefined,
                audioUrl: updateData.audioUrl || undefined
            })

            return {
                data: vocabulary,
                message: VOCABULARY_MESSAGE.UPDATE_SUCCESS
            }
        } catch (error) {
            // If it's our custom exceptions, re-throw them
            if (error === VocabularyNotFoundException || error === VocabularyAlreadyExistsException) {
                throw error
            }
            // Handle database errors
            if (isNotFoundPrismaError(error)) {
                throw VocabularyNotFoundException
            }
            if (isUniqueConstraintPrismaError(error)) {
                throw VocabularyAlreadyExistsException
            }
            this.logger.error('Error updating vocabulary:', error)
            throw InvalidVocabularyDataException
        }
    }
    //#endregion

    //#region Remove
    async remove(id: number) {
        try {
            const vocabulary = await this.vocabularyRepository.delete({ id })

            return {
                data: vocabulary,
                message: VOCABULARY_MESSAGE.DELETE_SUCCESS
            }
        } catch (error) {
            if (isNotFoundPrismaError(error)) {
                throw VocabularyNotFoundException
            }
            this.logger.error('Error deleting vocabulary:', error)
            throw InvalidVocabularyDataException
        }
    }
    //#endregion

    //#region Search By Word
    async searchByWord(word: string) {
        const vocabularies = await this.vocabularyRepository.findMany({
            page: 1,
            limit: 10,
            search: word
        })

        return {
            data: vocabularies,
            message: VOCABULARY_MESSAGE.SEARCH_SUCCESS
        }
    }
    //#endregion

    //#region File Upload Methods
    async uploadVocabularyImage(imageFile: Express.Multer.File, oldImageUrl?: string) {
        try {
            const imageUrl = await this.uploadService.uploadVocabularyImage(imageFile, oldImageUrl)
            return {
                data: { imageUrl },
                message: 'Upload hình ảnh từ vựng thành công'
            }
        } catch (error) {
            this.logger.error('Error uploading vocabulary image:', error)
            throw new Error('Upload hình ảnh thất bại')
        }
    }

    async uploadVocabularyAudio(audioFile: Express.Multer.File, oldAudioUrl?: string) {
        try {
            const audioUrl = await this.uploadService.uploadVocabularyAudio(audioFile, oldAudioUrl)
            return {
                data: { audioUrl },
                message: 'Upload âm thanh từ vựng thành công'
            }
        } catch (error) {
            this.logger.error('Error uploading vocabulary audio:', error)
            throw new Error('Upload âm thanh thất bại')
        }
    }

    async uploadVocabularyFiles(
        imageFile?: Express.Multer.File,
        audioFile?: Express.Multer.File,
        oldImageUrl?: string,
        oldAudioUrl?: string
    ) {
        try {
            const results = await this.uploadService.uploadVocabularyFiles(
                imageFile,
                audioFile,
                oldImageUrl,
                oldAudioUrl
            )
            return {
                data: results,
                message: 'Upload files từ vựng thành công'
            }
        } catch (error) {
            this.logger.error('Error uploading vocabulary files:', error)
            throw new Error('Upload files thất bại')
        }
    }

    //#endregion

    //#region Advanced Create with Meaning, WordType and Kanji

    /**
     * Tạo từ vựng mới với Meaning, WordType và xử lý Kanji thông minh
     */
    async createAdvanced(
        data: CreateVocabularyAdvancedDTO,
        createdById?: number
    ): Promise<VocabularyAdvancedResponseDTO> {
        try {
            this.logger.log(`Creating advanced vocabulary: ${data.word_jp}`)

            // Bước 1: Tạo bản ghi Vocabulary gốc
            const vocabularyData = {
                wordJp: data.word_jp,
                reading: data.reading,
                levelN: data.level_n,
                wordTypeId: data.word_type_id,
                audioUrl: data.audio_url,
                createdById: createdById
            }

            const vocabulary = await this.vocabularyRepository.createAdvanced(vocabularyData)

            // Bước 2: Xử lý và tạo các bản ghi Meaning
            if (data.meanings && data.meanings.length > 0) {
                const transformedMeanings = data.meanings.map(m => ({
                    languageCode: m.language_code,
                    meaningText: m.meaning_text
                }))
                await this.vocabularyRepository.createMeanings(vocabulary.id, transformedMeanings)
            }

            // Bước 3: Xử lý Kanji một cách thông minh
            const kanjiResult = await this.processKanjiIntelligently(data.word_jp, vocabulary.id)

            // Bước 4: Lấy thông tin đầy đủ của từ vựng vừa tạo
            const fullVocabulary = await this.vocabularyRepository.findByIdWithRelations(vocabulary.id)

            if (!fullVocabulary) {
                throw new Error('Không thể lấy thông tin từ vựng vừa tạo')
            }

            // Transform meanings to match DTO structure
            const transformedMeanings = fullVocabulary.meanings?.map(meaning => ({
                language_code: 'vi', // Default language code
                meaning_text: meaning.meaningKey || 'Nghĩa chưa được dịch'
            })) || []

            const response: VocabularyAdvancedResponseDTO = {
                vocabulary_id: fullVocabulary.id,
                word_jp: fullVocabulary.wordJp,
                reading: fullVocabulary.reading,
                meanings: transformedMeanings
            }

            this.logger.log(`Advanced vocabulary created successfully: ${vocabulary.id}`)
            return response

        } catch (error) {
            this.logger.error('Error creating advanced vocabulary:', error)
            throw new Error('Tạo từ vựng nâng cao thất bại')
        }
    }

    /**
     * Xử lý Kanji một cách thông minh
     */
    private async processKanjiIntelligently(
        wordJp: string,
        vocabularyId: number
    ): Promise<{ kanjiCharacters: string[], missingKanji: string[] }> {
        try {
            // Phân tích chuỗi word_jp để lọc ra các ký tự Kanji
            const kanjiCharacters = this.extractKanjiCharacters(wordJp)

            if (kanjiCharacters.length === 0) {
                return { kanjiCharacters: [], missingKanji: [] }
            }

            const missingKanji: string[] = []
            const kanjiMappings: { kanjiId: number, displayOrder: number }[] = []

            // Đối chiếu Kanji với database
            for (let i = 0; i < kanjiCharacters.length; i++) {
                const character = kanjiCharacters[i]
                const kanji = await this.vocabularyRepository.findKanjiByCharacter(character)

                if (kanji) {
                    kanjiMappings.push({
                        kanjiId: kanji.id,
                        displayOrder: i
                    })
                } else {
                    missingKanji.push(character)
                }
            }

            // Tạo liên kết Vocabulary_Kanji cho các Kanji đã tồn tại
            if (kanjiMappings.length > 0) {
                await this.vocabularyRepository.createVocabularyKanjiMappings(vocabularyId, kanjiMappings)
            }

            return { kanjiCharacters, missingKanji }

        } catch (error) {
            this.logger.error('Error processing Kanji intelligently:', error)
            throw new Error('Xử lý Kanji thất bại')
        }
    }

    /**
     * Trích xuất các ký tự Kanji từ chuỗi tiếng Nhật
     */
    private extractKanjiCharacters(wordJp: string): string[] {
        // Regex để tìm các ký tự Kanji (Unicode ranges: 4E00-9FAF, 3400-4DBF, etc.)
        const kanjiRegex = /[\u4E00-\u9FAF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF\uF900-\uFAFF\u2F800-\u2FA1F]/g
        const matches = wordJp.match(kanjiRegex)
        return matches ? [...new Set(matches)] : [] // Loại bỏ trùng lặp
    }

    //#endregion

    //#region Add Meaning to Existing Vocabulary
    /**
     * Thêm nghĩa mới cho từ vựng đã tồn tại
     */
    async addMeaningToExistingVocabulary(
        vocabularyId: number,
        meaningData: {
            wordTypeId?: number
            exampleSentenceJp?: string
        }
    ) {
        try {
            this.logger.log(`Adding new meaning to vocabulary ${vocabularyId}`)

            // Kiểm tra vocabulary có tồn tại không
            const vocabulary = await this.vocabularyRepository.findUnique({ id: vocabularyId })
            if (!vocabulary) {
                throw VocabularyNotFoundException
            }

            // Thêm meaning mới
            const meaning = await this.vocabularyHelperService.addMeaningToVocabulary(
                vocabularyId,
                meaningData
            )

            return {
                data: meaning,
                message: 'Thêm nghĩa mới thành công'
            }
        } catch (error) {
            this.logger.error(`Error adding meaning to vocabulary ${vocabularyId}:`, error)
            if (error === VocabularyNotFoundException) {
                throw error
            }
            throw new Error('Không thể thêm nghĩa mới')
        }
    }

    // Removed createOrAddMeaning - use createFullVocabularyWithFiles instead
    //#endregion

    //#region Create Full Vocabulary with Translations
    /**
     * Tạo vocabulary hoàn chỉnh với file uploads (audio + image)
     */
    async createFullVocabularyWithFiles(
        data: {
            word_jp: string
            reading: string
            level_n?: number
            word_type_id?: number
            translations: string | {
                meaning: Array<{ language_code: string; value: string }>
                examples?: Array<{ language_code: string; sentence: string; original_sentence: string }>
            }
        },
        audioFile?: Express.Multer.File,
        imageFile?: Express.Multer.File,
        createdById?: number
    ) {
        try {
            this.logger.log('Creating full vocabulary with file uploads')

            // Parse translations if it's a string (from multipart/form-data)
            let parsedTranslations: {
                meaning: Array<{ language_code: string; value: string }>
                examples?: Array<{ language_code: string; sentence: string; original_sentence: string }>
            }

            if (typeof data.translations === 'string') {
                this.logger.log('Parsing translations from JSON string')
                parsedTranslations = JSON.parse(data.translations)
            } else {
                parsedTranslations = data.translations
            }

            this.logger.log('Parsed translations:', parsedTranslations)

            // 1. Upload files if provided, or generate audio using TTS
            let audioUrl: string | undefined
            let imageUrl: string | undefined

            if (audioFile) {
                this.logger.log('Uploading audio file...')
                const audioResult = await this.uploadService.uploadFile(audioFile, 'vocabulary/audio')
                audioUrl = audioResult.url
                this.logger.log(`Audio uploaded: ${audioUrl}`)
            } else {
                // Generate audio using text-to-speech if no audio file provided
                this.logger.log('No audio file provided, generating audio using TTS...')
                try {
                    // 1. Generate audio using TTS
                    const ttsResult = await this.textToSpeechService.convertTextToSpeech(
                        data.word_jp,
                        { languageCode: 'ja-JP', audioEncoding: 'MP3' }
                    )

                    // 2. Create a buffer file to upload
                    const audioBuffer = ttsResult.audioContent
                    const fileName = `vocabulary_${data.word_jp}_${Date.now()}.mp3`

                    // Convert buffer to Multer file-like object
                    const generatedAudioFile: Express.Multer.File = {
                        buffer: audioBuffer,
                        originalname: fileName,
                        mimetype: 'audio/mpeg',
                        fieldname: 'audioFile',
                        encoding: '7bit',
                        size: audioBuffer.length,
                        stream: null as any,
                        destination: '',
                        filename: fileName,
                        path: ''
                    }

                    // 3. Upload to Cloudinary
                    const uploadResult = await this.uploadService.uploadFile(generatedAudioFile, 'vocabulary/audio')
                    audioUrl = uploadResult.url
                    this.logger.log(`Audio generated via TTS and uploaded: ${audioUrl}`)
                } catch (ttsError) {
                    this.logger.warn('Failed to generate audio using TTS:', ttsError)
                    // Continue without audio if TTS fails
                }
            }

            if (imageFile) {
                this.logger.log('Uploading image file...')
                const imageResult = await this.uploadService.uploadFile(imageFile, 'vocabulary/images')
                imageUrl = imageResult.url
                this.logger.log(`Image uploaded: ${imageUrl}`)
            }

            // 2. Check vocabulary exists
            const existingCheck = await this.vocabularyHelperService.checkVocabularyExists(
                data.word_jp,
                data.reading
            )

            if (existingCheck.exists && existingCheck.vocabularyId) {
                // Vocabulary exists → Add new meaning with translations
                this.logger.log(`Vocabulary already exists (ID: ${existingCheck.vocabularyId}), adding new meaning with translations`)

                const result = await this.vocabularyHelperService.addMeaningWithTranslations(
                    existingCheck.vocabularyId,
                    parsedTranslations,
                    data.word_type_id
                )

                return {
                    data: {
                        vocabularyId: existingCheck.vocabularyId,
                        meaningId: result.meaning.id,
                        translationsCreated: result.translationsCreated,
                        isNew: false,
                        audioUrl,
                        imageUrl
                    },
                    message: 'Từ vựng đã tồn tại. Đã thêm nghĩa mới với translations.'
                }
            } else {
                // Vocabulary doesn't exist → Create new
                this.logger.log('Creating new vocabulary with full translations and uploaded files')

                const result = await this.vocabularyHelperService.createVocabularyWithTranslations(
                    {
                        wordJp: data.word_jp,
                        reading: data.reading,
                        levelN: data.level_n,
                        audioUrl,
                        imageUrl,
                        createdById: createdById || undefined
                    },
                    parsedTranslations,
                    data.word_type_id
                )

                return {
                    data: {
                        vocabularyId: result.vocabulary.id,
                        meaningId: result.meaning.id,
                        translationsCreated: result.translationsCreated,
                        isNew: true,
                        vocabulary: result.vocabulary,
                        audioUrl,
                        imageUrl
                    },
                    message: VOCABULARY_MESSAGE.CREATE_SUCCESS
                }
            }
        } catch (error) {
            this.logger.error('Error creating full vocabulary with files:', error)
            throw InvalidVocabularyDataException
        }
    }
    //#endregion

}
