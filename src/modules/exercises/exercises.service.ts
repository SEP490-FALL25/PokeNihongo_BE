import { Injectable, Logger } from '@nestjs/common'
import {
    CreateExercisesBodyType,
    UpdateExercisesBodyType,
    GetExercisesByIdParamsType,
    GetExercisesListQueryType,
} from './entities/exercises.entities'
import {
    ExercisesNotFoundException,
    ExercisesAlreadyExistsException,
    InvalidExercisesDataException,
    LessonNotFoundException,
} from './dto/exercises.error'
import { CreateExercisesWithMeaningsBodyType } from './dto/exercises-with-meanings.dto'
import { UpdateExercisesWithMeaningsBodyType } from './dto/update-exercises-with-meanings.dto'
import { ExercisesRepository } from './exercises.repo'
import { TranslationService } from '@/modules/translation/translation.service'
import { LanguagesService } from '@/modules/languages/languages.service'
import { UploadService } from '@/3rdService/upload/upload.service'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'

@Injectable()
export class ExercisesService {
    private readonly logger = new Logger(ExercisesService.name)

    constructor(
        private readonly exercisesRepository: ExercisesRepository,
        private readonly translationService: TranslationService,
        private readonly languagesService: LanguagesService,
        private readonly uploadService: UploadService
    ) { }

    //#region Get Exercises
    async getExercisesList(params: GetExercisesListQueryType) {
        try {
            this.logger.log('Getting exercises list with params:', params)

            const result = await this.exercisesRepository.findMany(params)

            this.logger.log(`Found ${result.data.length} exercises entries`)
            return {
                statusCode: 200,
                message: 'Lấy danh sách bài tập thành công',
                data: {
                    results: result.data,
                    pagination: {
                        current: result.page,
                        pageSize: result.limit,
                        totalPage: result.totalPages,
                        totalItem: result.total
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error getting exercises list:', error)
            throw error
        }
    }

    async getExercisesById(params: GetExercisesByIdParamsType) {
        try {
            this.logger.log(`Getting exercises by id: ${params.id}`)

            const exercises = await this.exercisesRepository.findById(params.id)

            if (!exercises) {
                throw new ExercisesNotFoundException()
            }

            this.logger.log(`Found exercises: ${exercises.id}`)
            return {
                data: exercises,
                message: 'Lấy thông tin bài tập thành công'
            }
        } catch (error) {
            this.logger.error(`Error getting exercises by id ${params.id}:`, error)

            if (error instanceof ExercisesNotFoundException) {
                throw error
            }

            throw new InvalidExercisesDataException('Lỗi khi lấy thông tin bài tập')
        }
    }
    //#endregion

    //#region Create Exercises With Meanings
    async createExercisesWithMeanings(data: CreateExercisesWithMeaningsBodyType, audioFile?: Express.Multer.File) {
        try {
            this.logger.log(`Creating exercises with meanings: ${data.exerciseType}`)

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

            // Parse lessonId to number if it's a string (from multipart/form-data)
            const lessonId = typeof data.lessonId === 'string' ? parseInt(data.lessonId) : data.lessonId
            this.logger.log(`Parsed lessonId: ${lessonId} (type: ${typeof lessonId})`)

            // Parse other fields from multipart/form-data
            const isBlocked = typeof data.isBlocked === 'string' ? data.isBlocked === 'true' : (data.isBlocked || false)
            const price = data.price ? (typeof data.price === 'string' ? parseFloat(data.price) : data.price) : null
            this.logger.log(`Parsed isBlocked: ${isBlocked} (type: ${typeof isBlocked})`)
            this.logger.log(`Parsed price: ${price} (type: ${typeof price})`)

            // Check if lesson exists
            const lessonExists = await this.exercisesRepository.checkLessonExists(lessonId)
            if (!lessonExists) {
                throw new LessonNotFoundException()
            }

            // Upload audio file nếu có
            let audioUrl = data.audioUrl
            this.logger.log(`Initial audioUrl: ${audioUrl}`)
            this.logger.log(`Audio file exists: ${!!audioFile}`)

            if (audioFile) {
                this.logger.log(`Uploading audio file for exercises: ${data.exerciseType}`)
                const uploadResult = await this.uploadService.uploadFile(audioFile, 'exercises')
                audioUrl = uploadResult.url
                this.logger.log(`Audio file uploaded successfully: ${audioUrl}`)
            }

            this.logger.log(`Final audioUrl for database: ${audioUrl}`)

            // Tạo exercises
            const exercisesData = {
                exerciseType: data.exerciseType,
                content: data.content,
                audioUrl: audioUrl,
                isBlocked: isBlocked, // Use parsed isBlocked
                price: price, // Use parsed price
                lessonId: lessonId, // Use parsed lessonId
            }

            this.logger.log(`Exercises data to create: ${JSON.stringify(exercisesData)}`)

            const exercises = await this.exercisesRepository.create(exercisesData)
            this.logger.log(`Exercises created successfully: ${exercises.id}`)

            // Xử lý meanings - chỉ lấy meaning đầu tiên và cập nhật vào meaningKey chính
            const meanings: any[] = []
            this.logger.log(`Processing meanings for exercises ${exercises.id}`)

            if (data.meanings && data.meanings.length > 0) {
                // Chỉ lấy meaning đầu tiên
                const meaningData = data.meanings[0]
                this.logger.log(`Processing main meaning:`, meaningData)

                try {
                    // Tự động generate meaningKey
                    const meaningKey = `exercise.${exercises.id}.meaning`
                    this.logger.log(`Auto-generated meaningKey: ${meaningKey}`)

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
                    this.logger.warn(`Failed to create main meaning for exercises ${exercises.id}`)
                }
            }

            this.logger.log(`Exercises with meanings created successfully: ${exercises.id}`)

            return {
                data: {
                    exercises: updatedExercises,
                    meanings
                },
                message: 'Tạo bài tập cùng với nghĩa thành công'
            }
        } catch (error) {
            this.logger.error('Error creating exercises with meanings:', error)
            if (error instanceof LessonNotFoundException || error instanceof ExercisesAlreadyExistsException) {
                throw error
            }

            if (isUniqueConstraintPrismaError(error)) {
                throw new ExercisesAlreadyExistsException()
            }

            throw new InvalidExercisesDataException('Lỗi khi tạo bài tập')
        }
    }
    //#endregion

    //#region Update Exercises With Meanings
    async updateExercisesWithMeanings(identifier: string, data: UpdateExercisesWithMeaningsBodyType, audioFile?: Express.Multer.File) {
        try {
            this.logger.log(`Updating exercises with meanings: ${identifier}`)
            this.logger.log(`Update data: ${JSON.stringify(data)}`)

            // Parse meanings nếu là string (từ multipart/form-data)
            if (typeof data.meanings === 'string') {
                try {
                    // Loại bỏ dấu phẩy thừa và whitespace
                    const cleanedJson = (data.meanings as string)
                        .replace(/,\s*}/g, '}')  // Loại bỏ dấu phẩy trước }
                        .replace(/,\s*]/g, ']')  // Loại bỏ dấu phẩy trước ]
                        .trim()

                    this.logger.log(`Cleaned JSON: ${cleanedJson}`)
                    data.meanings = JSON.parse(cleanedJson)
                    this.logger.log(`Parsed meanings from string: ${JSON.stringify(data.meanings)}`)
                } catch (error) {
                    this.logger.error('Failed to parse meanings JSON:', error)
                    this.logger.error(`Original JSON string: "${data.meanings}"`)
                    throw new Error('Invalid JSON format for meanings')
                }
            }

            // Nếu meanings là object thay vì array, chuyển thành array
            if (data.meanings && !Array.isArray(data.meanings)) {
                data.meanings = [data.meanings]
                this.logger.log(`Converted meanings object to array: ${JSON.stringify(data.meanings)}`)
            }

            // Kiểm tra identifier là ID (số) hay không
            let existingExercises
            const isNumeric = /^\d+$/.test(identifier)

            if (isNumeric) {
                // Nếu là số, tìm bằng ID
                existingExercises = await this.exercisesRepository.findById(parseInt(identifier))
            } else {
                throw new InvalidExercisesDataException('Chỉ có thể cập nhật exercises bằng ID')
            }

            if (!existingExercises) {
                throw new ExercisesNotFoundException()
            }

            // Parse fields from multipart/form-data for update
            const parsedLessonId = data.lessonId ? (typeof data.lessonId === 'string' ? parseInt(data.lessonId) : data.lessonId) : undefined
            const parsedIsBlocked = data.isBlocked !== undefined ? (typeof data.isBlocked === 'string' ? data.isBlocked === 'true' : data.isBlocked) : undefined
            const parsedPrice = data.price ? (typeof data.price === 'string' ? parseFloat(data.price) : data.price) : undefined

            // Check if lesson exists (if updating lessonId)
            if (parsedLessonId) {
                const lessonExists = await this.exercisesRepository.checkLessonExists(parsedLessonId)
                if (!lessonExists) {
                    throw new LessonNotFoundException()
                }
            }

            // Xử lý file âm thanh - chỉ dùng file upload như hàm create
            let audioUrl = existingExercises.audioUrl // Giữ lại URL hiện có

            if (audioFile) {
                // Upload file âm thanh mới nếu có
                this.logger.log(`Uploading audio file for exercises: ${existingExercises.id}`)
                const uploadResult = await this.uploadService.uploadFile(audioFile, 'exercises')
                audioUrl = uploadResult.url
                this.logger.log(`Audio file uploaded successfully: ${audioUrl}`)
            }
            // Nếu không có file upload, giữ nguyên URL hiện có

            this.logger.log(`Final audioUrl for database: ${audioUrl}`)

            // Cập nhật exercises
            const exercisesData = {
                exerciseType: data.exerciseType,
                content: data.content,
                audioUrl: audioUrl,
                isBlocked: parsedIsBlocked,
                price: parsedPrice,
                lessonId: parsedLessonId
            }

            this.logger.log(`Exercises data to update: ${JSON.stringify(exercisesData)}`)

            const exercises = await this.exercisesRepository.updatePartial(existingExercises.id, exercisesData)
            this.logger.log(`Exercises updated successfully: ${exercises.id}`)


            // Cập nhật/tạo meanings
            const meanings: any[] = []
            if (data.meanings && data.meanings.length > 0) {
                for (const meaningData of data.meanings) {
                    try {
                        let meaningKey = meaningData.meaningKey

                        // Nếu không có meaningKey, tự động generate từ exercises ID
                        if (!meaningKey) {
                            meaningKey = `exercise.${existingExercises.id}.meaning`
                            this.logger.log(`Auto-generated meaningKey: ${meaningKey}`)
                        }

                        // Kiểm tra translation đã tồn tại chưa để quyết định tạo mới hay update
                        if (meaningData.translations) {
                            await this.createOrUpdateTranslationsForLanguages(meaningKey, meaningData.translations)
                        } else {
                            // Nếu không có translations, chỉ tạo translation mặc định
                            await this.createTranslationForMeaningKey(meaningKey)
                        }

                        // Lưu thông tin meaning
                        meanings.push({
                            id: meaningData.id,
                            meaningKey: meaningKey,
                            translations: meaningData.translations
                        })
                    } catch (error) {
                        this.logger.warn(`Failed to update/create meaning for exercises ${existingExercises.id}`, error)
                    }
                }
            }

            this.logger.log(`Exercises with meanings updated successfully: ${exercises.id}`)

            return {
                data: {
                    exercises,
                    meanings
                },
                message: 'Cập nhật bài tập cùng với nghĩa thành công'
            }
        } catch (error) {
            this.logger.error('Error updating exercises with meanings:', error)
            if (error.message.includes('không tồn tại') || error.message.includes('đã tồn tại')) {
                throw error
            }
            throw new InvalidExercisesDataException('Lỗi khi cập nhật bài tập')
        }
    }

    // Tạo hoặc cập nhật translations cho các ngôn ngữ
    private async createOrUpdateTranslationsForLanguages(meaningKey: string, translations: Record<string, string>) {
        try {
            this.logger.log(`Creating/updating translations for meaningKey: ${meaningKey}`)

            for (const [langCode, value] of Object.entries(translations)) {
                try {
                    // Tìm ngôn ngữ theo code
                    const languages = await this.languagesService.findMany({
                        page: 1,
                        limit: 100,
                        code: langCode
                    })

                    if (!languages.data?.results || languages.data.results.length === 0) {
                        this.logger.warn(`Language ${langCode} not found, skipping`)
                        continue
                    }

                    const language = languages.data.results[0]

                    // Kiểm tra translation đã tồn tại chưa
                    const existingTranslation = await this.translationService.findByKeyAndLanguage(
                        meaningKey,
                        language.id
                    )

                    if (existingTranslation) {
                        // Update translation đã tồn tại
                        await this.translationService.update(existingTranslation.id, {
                            value: value
                        })
                        this.logger.log(`Updated translation for key: ${meaningKey}, language: ${language.code}, value: ${value}`)
                    } else {
                        // Tạo translation mới
                        await this.translationService.create({
                            key: meaningKey,
                            languageId: language.id,
                            value: value
                        })
                        this.logger.log(`Created new translation for key: ${meaningKey}, language: ${language.code}, value: ${value}`)
                    }
                } catch (error) {
                    this.logger.warn(`Failed to create/update translation for key: ${meaningKey}, language: ${langCode}`, error)
                }
            }
        } catch (error) {
            this.logger.error(`Error creating/updating translations for meaningKey: ${meaningKey}`, error)
            throw error
        }
    }

    // Tự động tạo translation cho meaningKey
    private async createTranslationForMeaningKey(meaningKey: string) {
        try {
            // Kiểm tra meaningKey có tồn tại không
            if (!meaningKey || meaningKey.trim() === '') {
                this.logger.warn(`MeaningKey is empty or undefined: ${meaningKey}`)
                return
            }

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

                    if (!languages.data?.results || languages.data.results.length === 0) {
                        this.logger.warn(`Language ${langCode} not found, skipping`)
                        continue
                    }

                    const language = languages.data.results[0]

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
            // Không throw error để không ảnh hưởng đến việc cập nhật exercises
        }
    }
    //#endregion

    //#region Delete Exercises
    async deleteExercises(id: number) {
        try {
            this.logger.log(`Deleting exercises ${id}`)

            // Check if exercises exists
            const exercises = await this.exercisesRepository.findById(id)
            if (!exercises) {
                throw new ExercisesNotFoundException()
            }

            await this.exercisesRepository.delete(id)

            this.logger.log(`Deleted exercises ${id}`)
            return {
                message: 'Xóa bài tập thành công'
            }
        } catch (error) {
            this.logger.error(`Error deleting exercises ${id}:`, error)

            if (error instanceof ExercisesNotFoundException) {
                throw error
            }

            if (isNotFoundPrismaError(error)) {
                throw new ExercisesNotFoundException()
            }

            throw new InvalidExercisesDataException('Lỗi khi xóa bài tập')
        }
    }
    //#endregion

    //#region Translation Helper Methods

    // Tạo translations cho các ngôn ngữ cụ thể
    private async createTranslationsForLanguages(meaningKey: string, translations: Record<string, string>) {
        try {
            this.logger.log(`Creating specific translations for meaningKey: ${meaningKey}`)

            // Lấy danh sách các ngôn ngữ để map code -> id
            const languages = await this.languagesService.findMany({ page: 1, limit: 100 })

            if (!languages.data || !languages.data.results || languages.data.results.length === 0) {
                this.logger.warn('No languages found, skipping specific translation creation')
                return
            }

            // Tạo map code -> id
            const languageMap = new Map<string, number>()
            for (const language of languages.data.results) {
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
    //#endregion
}
