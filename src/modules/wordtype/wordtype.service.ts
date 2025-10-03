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

@Injectable()
export class WordTypeService {
    private readonly logger = new Logger(WordTypeService.name)

    constructor(private readonly wordTypeRepository: WordTypeRepository) { }

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

    // Removed findByTag - use findByNameKey instead

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

            const defaultTags = [
                'noun', 'verb', 'adjective', 'adverb',
                'particle', 'pronoun', 'conjunction', 'interjection'
            ]

            for (const tag of defaultTags) {
                const nameKey = `wordtype.${tag}.name`
                const existing = await this.wordTypeRepository.findByNameKey(nameKey)
                if (!existing) {
                    await this.wordTypeRepository.create({ nameKey })
                    this.logger.log(`Created default word type: ${nameKey}`)
                }
            }

            this.logger.log('Default word types creation completed')
        } catch (error) {
            this.logger.error('Error creating default word types:', error)
            throw InvalidWordTypeDataException
        }
    }
}

