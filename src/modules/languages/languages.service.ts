import {
    CreateLanguagesBodyType,
    UpdateLanguagesBodyType,
    GetLanguagesListQueryType,
    GetLanguagesByCodeParamsType,
    LanguagesType
} from './entities/languages.entities'
import { LanguagesRepository } from './languages.repo'
import {
    LanguagesNotFoundException,
    LanguagesAlreadyExistsException,
    InvalidLanguagesDataException,
    LanguageCodeAlreadyExistsException
} from './dto/languages.error'
import { LANGUAGES_MESSAGE } from '@/common/constants/message'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { Injectable, Logger, HttpException } from '@nestjs/common'

@Injectable()
export class LanguagesService {
    private readonly logger = new Logger(LanguagesService.name)

    constructor(private readonly languagesRepository: LanguagesRepository) { }

    async findMany(params: GetLanguagesListQueryType) {
        try {
            this.logger.log(`Finding languages with params: ${JSON.stringify(params)}`)
            const result = await this.languagesRepository.findMany(params)

            return {
                data: {
                    items: result.data,
                    total: result.total,
                    page: result.page,
                    limit: result.limit
                },
                message: LANGUAGES_MESSAGE.GET_LIST_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error finding languages:', error)
            throw error
        }
    }

    async findById(id: number) {
        try {
            this.logger.log(`Finding language by id: ${id}`)
            const language = await this.languagesRepository.findById(id)

            if (!language) {
                throw LanguagesNotFoundException
            }

            return {
                data: language,
                message: LANGUAGES_MESSAGE.GET_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error finding language by id:', error)
            throw error
        }
    }

    async findByCode(params: GetLanguagesByCodeParamsType) {
        try {
            this.logger.log(`Finding language by code: ${params.code}`)
            const language = await this.languagesRepository.findByCode(params.code)

            if (!language) {
                throw LanguagesNotFoundException
            }

            return {
                data: language,
                message: LANGUAGES_MESSAGE.GET_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error finding language by code:', error)
            throw error
        }
    }

    async create(data: CreateLanguagesBodyType) {
        try {
            this.logger.log(`Creating language: ${data.code} - ${data.name}`)

            // Kiểm tra ngôn ngữ đã tồn tại chưa
            const existingLanguage = await this.languagesRepository.findByCode(data.code)
            if (existingLanguage) {
                this.logger.error('Language already exists:', data.code)
                throw LanguagesAlreadyExistsException
            }

            const language = await this.languagesRepository.create(data)
            this.logger.log(`Language created successfully: ${language.id}`)

            return {
                data: language,
                message: LANGUAGES_MESSAGE.CREATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error creating language:', error)
            if (error instanceof HttpException) {
                throw error
            }
            if (isUniqueConstraintPrismaError(error)) {
                throw LanguagesAlreadyExistsException
            }
            throw error
        }
    }

    async update(id: number, data: UpdateLanguagesBodyType) {
        try {
            this.logger.log(`Updating language: ${id}`)

            // Kiểm tra ngôn ngữ có tồn tại không
            const existingLanguage = await this.languagesRepository.findById(id)
            if (!existingLanguage) {
                throw LanguagesNotFoundException
            }

            // Nếu thay đổi code, kiểm tra code mới có trùng không
            if (data.code && data.code !== existingLanguage.code) {
                const duplicateLanguage = await this.languagesRepository.findByCode(data.code)
                if (duplicateLanguage) {
                    throw LanguagesAlreadyExistsException
                }
            }

            const language = await this.languagesRepository.update(id, data)
            this.logger.log(`Language updated successfully: ${language.id}`)

            return {
                data: language,
                message: LANGUAGES_MESSAGE.UPDATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error updating language:', error)
            if (error instanceof HttpException) {
                throw error
            }
            throw error
        }
    }

    async updateByCode(code: string, data: UpdateLanguagesBodyType) {
        try {
            this.logger.log(`Updating language by code: ${code}`)

            // Kiểm tra ngôn ngữ có tồn tại không
            const existingLanguage = await this.languagesRepository.findByCode(code)
            if (!existingLanguage) {
                throw LanguagesNotFoundException
            }

            // Nếu thay đổi code, kiểm tra code mới có trùng không
            if (data.code && data.code !== code) {
                const duplicateLanguage = await this.languagesRepository.findByCode(data.code)
                if (duplicateLanguage) {
                    throw LanguagesAlreadyExistsException
                }
            }

            const language = await this.languagesRepository.updateByCode(code, data)
            this.logger.log(`Language updated successfully: ${language.id}`)

            return {
                data: language,
                message: LANGUAGES_MESSAGE.UPDATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error updating language by code:', error)
            throw InvalidLanguagesDataException
        }
    }

    async delete(id: number) {
        try {
            this.logger.log(`Deleting language: ${id}`)

            // Kiểm tra ngôn ngữ có tồn tại không
            const existingLanguage = await this.languagesRepository.findById(id)
            if (!existingLanguage) {
                throw LanguagesNotFoundException
            }

            await this.languagesRepository.delete(id)
            this.logger.log(`Language deleted successfully: ${id}`)

            return {
                message: LANGUAGES_MESSAGE.DELETE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error deleting language:', error)
            throw InvalidLanguagesDataException
        }
    }

    async deleteByCode(code: string) {
        try {
            this.logger.log(`Deleting language by code: ${code}`)

            // Kiểm tra ngôn ngữ có tồn tại không
            const existingLanguage = await this.languagesRepository.findByCode(code)
            if (!existingLanguage) {
                throw LanguagesNotFoundException
            }

            await this.languagesRepository.deleteByCode(code)
            this.logger.log(`Language deleted successfully: ${code}`)

            return {
                message: LANGUAGES_MESSAGE.DELETE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error deleting language by code:', error)
            throw InvalidLanguagesDataException
        }
    }

    /**
     * Lấy tất cả ngôn ngữ được hỗ trợ
     */
    async getAllSupportedLanguages() {
        try {
            this.logger.log('Getting all supported languages')
            const result = await this.languagesRepository.findMany({
                page: 1,
                limit: 1000 // Lấy tất cả
            })

            return {
                data: {
                    items: result.data,
                    total: result.total,
                    page: result.page,
                    limit: result.limit
                },
                message: LANGUAGES_MESSAGE.GET_LIST_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error getting all supported languages:', error)
            throw error
        }
    }

    /**
     * Kiểm tra ngôn ngữ có được hỗ trợ không
     */
    async isLanguageSupported(code: string): Promise<boolean> {
        try {
            const language = await this.languagesRepository.findByCode(code)
            return !!language
        } catch (error) {
            this.logger.error(`Error checking if language ${code} is supported:`, error)
            return false
        }
    }
}
