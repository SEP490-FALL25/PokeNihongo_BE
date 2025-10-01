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
    VocabularyNotFoundException
} from '@/modules/vocabulary/dto/vocabulary.error'
import { VocabularyRepository } from '@/modules/vocabulary/vocabulary.repo'
import { VOCABULARY_MESSAGE } from '@/common/constants/message'
import { UploadService } from '@/3rdService/upload/upload.service'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class VocabularyService {
    private readonly logger = new Logger(VocabularyService.name)

    constructor(
        private readonly vocabularyRepository: VocabularyRepository,
        private readonly uploadService: UploadService
    ) { }

    //#region Create
    async create(body: CreateVocabularyBodyType, imageFile?: Express.Multer.File, audioFile?: Express.Multer.File) {
        try {
            // Check if vocabulary already exists FIRST
            const existingVocabulary = await this.vocabularyRepository.findFirst({
                wordJp: body.wordJp
            })

            if (existingVocabulary) {
                throw VocabularyAlreadyExistsException
            }

            // Upload files only if vocabulary doesn't exist
            const uploadResults = await this.uploadVocabularyFiles(imageFile, audioFile)

            // Create vocabulary with uploaded URLs
            const vocabularyData = {
                ...body,
                imageUrl: uploadResults.data.imageUrl,
                audioUrl: uploadResults.data.audioUrl
            }

            const vocabulary = await this.vocabularyRepository.create({
                ...vocabularyData,
                imageUrl: vocabularyData.imageUrl || undefined,
                audioUrl: vocabularyData.audioUrl || undefined
            })

            return {
                data: vocabulary,
                message: VOCABULARY_MESSAGE.CREATE_SUCCESS
            }
        } catch (error) {
            // If it's our custom exception, re-throw it
            if (error === VocabularyAlreadyExistsException) {
                throw error
            }
            // Handle database unique constraint errors
            if (isUniqueConstraintPrismaError(error)) {
                throw VocabularyAlreadyExistsException
            }
            this.logger.error('Error creating vocabulary:', error)
            throw InvalidVocabularyDataException
        }
    }
    //#endregion

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
    //#endregion

    //#region Update
    async update(id: number, body: UpdateVocabularyBodyType, imageFile?: Express.Multer.File, audioFile?: Express.Multer.File) {
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

            // Update vocabulary with new URLs
            const updateData = {
                ...body,
                imageUrl: uploadResults.data.imageUrl || existingVocabulary.imageUrl,
                audioUrl: uploadResults.data.audioUrl || existingVocabulary.audioUrl
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

}
