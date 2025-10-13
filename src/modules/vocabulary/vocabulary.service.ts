import {
    CreateVocabularyBodyType,
    GetVocabularyByIdParamsType,
    GetVocabularyListQueryType,
    UpdateVocabularyBodyType,
    VocabularyType
} from '@/modules/vocabulary/entities/vocabulary.entities'
import {
    InvalidVocabularyDataException,
    VocabularyAlreadyExistsException,
    VocabularyNotFoundException,
    MeaningAlreadyExistsException
} from '@/modules/vocabulary/dto/vocabulary.error'
import { VocabularyRepository } from '@/modules/vocabulary/vocabulary.repo'
import { VocabularyHelperService } from '@/modules/vocabulary/vocabulary.helper.service'
import { VOCABULARY_MESSAGE } from '@/common/constants/message'
import { UploadService } from '@/3rdService/upload/upload.service'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { TranslationService } from '@/modules/translation/translation.service'
import { LanguagesService } from '@/modules/languages/languages.service'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class VocabularyService {
    private readonly logger = new Logger(VocabularyService.name)

    constructor(
        private readonly vocabularyRepository: VocabularyRepository,
        private readonly uploadService: UploadService,
        private readonly textToSpeechService: TextToSpeechService,
        private readonly vocabularyHelperService: VocabularyHelperService,
        private readonly translationService: TranslationService,
        private readonly languagesService: LanguagesService
    ) { }

    // Removed old create method - use createFullVocabularyWithFiles instead

    //#region Find All
    async findAll(query: GetVocabularyListQueryType, lang: string) {
        const { currentPage, pageSize, search, levelN, sortBy, sort } = query

        const result = await this.vocabularyRepository.findMany({
            currentPage,
            pageSize,
            search,
            levelN,
            sortBy,
            sort
        })

        // Resolve translation values for wordType.nameKey per requested language
        let languageId: number | undefined
        try {
            const language = await this.languagesService.findByCode({ code: lang })
            languageId = language?.data?.id
        } catch {
            languageId = undefined
        }

        const resultsWithWordType = await Promise.all(
            result.items.map(async (item) => {
                if (!item.wordType || !languageId) {
                    return item
                }

                try {
                    const translation = await this.translationService.findByKeyAndLanguage(
                        item.wordType.nameKey,
                        languageId as number
                    )
                    const name = translation?.value || item.wordType.nameKey
                    return {
                        ...item,
                        wordType: {
                            ...item.wordType,
                            name
                        }
                    }
                } catch {
                    return {
                        ...item,
                        wordType: {
                            ...item.wordType,
                            name: item.wordType.nameKey
                        }
                    }
                }
            })
        )

        return {
            statusCode: 200,
            message: VOCABULARY_MESSAGE.GET_LIST_SUCCESS,
            data: {
                results: resultsWithWordType,
                pagination: {
                    current: result.page,
                    pageSize: result.limit,
                    totalPage: Math.ceil(result.total / result.limit),
                    totalItem: result.total
                }
            }
        }
    }
    //#endregion

    //#region Find One
    async findOne(params: GetVocabularyByIdParamsType, lang: string) {
        const vocabulary = await this.vocabularyRepository.findUnique({
            id: params.id
        })

        if (!vocabulary) {
            throw VocabularyNotFoundException
        }

        // Resolve wordType translation if present
        let vocabularyWithWordType = vocabulary
        if (vocabulary.wordType) {
            try {
                const language = await this.languagesService.findByCode({ code: lang })
                if (language?.data?.id) {
                    const translation = await this.translationService.findByKeyAndLanguage(
                        vocabulary.wordType.nameKey,
                        language.data.id
                    )
                    const name = translation?.value || vocabulary.wordType.nameKey
                    vocabularyWithWordType = {
                        ...vocabulary,
                        wordType: {
                            ...vocabulary.wordType,
                            name
                        }
                    }
                }
            } catch {
                // Keep original wordType if translation fails
                vocabularyWithWordType = {
                    ...vocabulary,
                    wordType: {
                        ...vocabulary.wordType,
                        name: vocabulary.wordType.nameKey
                    }
                }
            }
        }

        return {
            data: vocabularyWithWordType,
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

                // Get full vocabulary information
                const vocabulary = await this.vocabularyRepository.findUnique({ id: existingCheck.vocabularyId })
                if (!vocabulary) {
                    throw VocabularyNotFoundException
                }

                // Tạo response với meaning và examples cho trường hợp vocabulary đã tồn tại
                const meaning = parsedTranslations.meaning.map(m => ({
                    language_code: m.language_code,
                    value: m.value
                }))

                const examples = parsedTranslations.examples ? parsedTranslations.examples.map(e => ({
                    language_code: e.language_code,
                    sentence: e.sentence,
                    original_sentence: e.original_sentence
                })) : []

                return {
                    data: {
                        vocabulary: {
                            ...vocabulary,
                            imageUrl: imageUrl || vocabulary.imageUrl,
                            audioUrl: audioUrl || vocabulary.audioUrl
                        },
                        meaning: {
                            id: result.meaning.id,
                            translations: meaning,
                            examples: examples
                        },
                        translationsCreated: result.translationsCreated,
                        isNew: false
                    },
                    message: VOCABULARY_MESSAGE.ADD_MEANING_SUCCESS
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

                // Tạo response với meaning và examples
                const meaning = parsedTranslations.meaning.map(m => ({
                    language_code: m.language_code,
                    value: m.value
                }))

                const examples = parsedTranslations.examples ? parsedTranslations.examples.map(e => ({
                    language_code: e.language_code,
                    sentence: e.sentence,
                    original_sentence: e.original_sentence
                })) : []

                return {
                    data: {
                        vocabulary: {
                            ...result.vocabulary,
                            imageUrl,
                            audioUrl
                        },
                        meaning: {
                            id: result.meaning.id,
                            translations: meaning,
                            examples: examples
                        },
                        translationsCreated: result.translationsCreated,
                        isNew: true
                    },
                    message: VOCABULARY_MESSAGE.CREATE_FULL_SUCCESS
                }
            }
        } catch (error) {
            this.logger.error('Error creating full vocabulary with files:', error)
            // Let MeaningAlreadyExistsException bubble up, only catch other errors
            if (error && error.status === 409 && error.response?.error === 'MEANING_ALREADY_EXISTS') {
                throw error
            }
            throw InvalidVocabularyDataException
        }
    }
    //#endregion

    //#region Create Sample Vocabularies
    /**
     * Tạo nhiều từ vựng mẫu với dữ liệu mặc định
     */
    async createSampleVocabularies(userId?: number) {
        try {
            this.logger.log('Creating sample vocabularies...')

            // Dữ liệu mẫu cho các từ vựng tiếng Nhật cơ bản
            // word_jp: Hán tự (Kanji) hoặc Hiragana/Katakana nếu không có Kanji
            // reading: Hiragana (cách đọc)
            const sampleVocabularies = [
                {
                    word_jp: '水',
                    reading: 'みず',
                    level_n: 5,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Nước' },
                            { language_code: 'en', value: 'Water' }
                        ]
                    }
                },
                {
                    word_jp: '山',
                    reading: 'やま',
                    level_n: 5,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Núi' },
                            { language_code: 'en', value: 'Mountain' }
                        ]
                    }
                },
                {
                    word_jp: '人',
                    reading: 'ひと',
                    level_n: 5,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Người' },
                            { language_code: 'en', value: 'Person' }
                        ]
                    }
                },
                {
                    word_jp: '家',
                    reading: 'いえ',
                    level_n: 5,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Nhà' },
                            { language_code: 'en', value: 'House / Home' }
                        ]
                    }
                },
                {
                    word_jp: '学校',
                    reading: 'がっこう',
                    level_n: 5,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Trường học' },
                            { language_code: 'en', value: 'School' }
                        ]
                    }
                },
                {
                    word_jp: '電話',
                    reading: 'でんわ',
                    level_n: 4,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Điện thoại' },
                            { language_code: 'en', value: 'Telephone' }
                        ]
                    }
                },
                {
                    word_jp: '車',
                    reading: 'くるま',
                    level_n: 4,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Xe ô tô' },
                            { language_code: 'en', value: 'Car' }
                        ]
                    }
                },
                {
                    word_jp: '飛行機',
                    reading: 'ひこうき',
                    level_n: 4,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Máy bay' },
                            { language_code: 'en', value: 'Airplane' }
                        ]
                    }
                },
                {
                    word_jp: '犬',
                    reading: 'いぬ',
                    level_n: 5,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Con chó' },
                            { language_code: 'en', value: 'Dog' }
                        ]
                    }
                },
                {
                    word_jp: '猫',
                    reading: 'ねこ',
                    level_n: 5,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Con mèo' },
                            { language_code: 'en', value: 'Cat' }
                        ]
                    }
                },
                {
                    word_jp: '食べ物',
                    reading: 'たべもの',
                    level_n: 5,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Đồ ăn' },
                            { language_code: 'en', value: 'Food' }
                        ]
                    }
                },
                {
                    word_jp: '私',
                    reading: 'わたし',
                    level_n: 5,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Tôi' },
                            { language_code: 'en', value: 'I / Me' }
                        ]
                    }
                },
                {
                    word_jp: 'あなた',
                    reading: 'あなた',
                    level_n: 5,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Bạn / Anh / Chị' },
                            { language_code: 'en', value: 'You' }
                        ]
                    }
                },
                {
                    word_jp: '本',
                    reading: 'ほん',
                    level_n: 5,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Sách' },
                            { language_code: 'en', value: 'Book' }
                        ]
                    }
                },
                {
                    word_jp: '友達',
                    reading: 'ともだち',
                    level_n: 5,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Bạn bè' },
                            { language_code: 'en', value: 'Friend' }
                        ]
                    }
                },
                {
                    word_jp: '先生',
                    reading: 'せんせい',
                    level_n: 4,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Giáo viên / Thầy cô' },
                            { language_code: 'en', value: 'Teacher' }
                        ]
                    }
                },
                {
                    word_jp: '学生',
                    reading: 'がくせい',
                    level_n: 4,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Học sinh / Sinh viên' },
                            { language_code: 'en', value: 'Student' }
                        ]
                    }
                },
                {
                    word_jp: '日本語',
                    reading: 'にほんご',
                    level_n: 4,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Tiếng Nhật' },
                            { language_code: 'en', value: 'Japanese language' }
                        ]
                    }
                },
                {
                    word_jp: '英語',
                    reading: 'えいご',
                    level_n: 4,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Tiếng Anh' },
                            { language_code: 'en', value: 'English language' }
                        ]
                    }
                },
                {
                    word_jp: '時間',
                    reading: 'じかん',
                    level_n: 4,
                    translations: {
                        meaning: [
                            { language_code: 'vi', value: 'Thời gian' },
                            { language_code: 'en', value: 'Time' }
                        ]
                    }
                }
            ]

            const createdVocabularies: any[] = []
            const errors: Array<{ word: string; error: string }> = []

            // Tạo từng từ vựng một cách tuần tự để tránh conflict
            for (const vocabData of sampleVocabularies) {
                try {
                    this.logger.log(`Creating vocabulary: ${vocabData.word_jp}`)

                    const result = await this.createFullVocabularyWithFiles(
                        vocabData,
                        undefined, // no audio file
                        undefined, // no image file
                        userId
                    )

                    createdVocabularies.push(result.data)
                    this.logger.log(`Successfully created: ${vocabData.word_jp}`)
                } catch (error) {
                    this.logger.warn(`Failed to create vocabulary ${vocabData.word_jp}:`, error.message)
                    errors.push({
                        word: vocabData.word_jp,
                        error: error.message || 'Unknown error'
                    })
                }
            }

            this.logger.log(`Sample vocabularies creation completed. Created: ${createdVocabularies.length}, Errors: ${errors.length}`)

            return {
                statusCode: 201,
                message: `${VOCABULARY_MESSAGE.CREATE_SAMPLE_SUCCESS}. Đã tạo ${createdVocabularies.length} từ vựng`,
                data: {
                    results: createdVocabularies,
                    pagination: {
                        current: 1,
                        pageSize: createdVocabularies.length,
                        totalPage: 1,
                        totalItem: createdVocabularies.length
                    },
                    summary: {
                        totalAttempted: sampleVocabularies.length,
                        successfullyCreated: createdVocabularies.length,
                        failed: errors.length,
                        errors: errors
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error creating sample vocabularies:', error)
            throw InvalidVocabularyDataException
        }
    }
    //#endregion

}
