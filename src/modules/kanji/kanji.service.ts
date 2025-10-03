import {
    CreateKanjiBodyType,
    UpdateKanjiBodyType,
    GetKanjiListQueryType,
    Kanji
} from './entities/kanji.entities'
import { KanjiRepository } from './kanji.repo'
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

    constructor(private readonly kanjiRepository: KanjiRepository) { }

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

    async create(data: CreateKanjiBodyType) {
        try {
            this.logger.log(`Creating kanji: ${data.character}`)

            // Kiểm tra character đã tồn tại chưa
            const existingKanji = await this.kanjiRepository.findByCharacter(data.character)
            if (existingKanji) {
                throw KanjiAlreadyExistsException
            }

            const kanji = await this.kanjiRepository.create(data)
            this.logger.log(`Kanji created successfully: ${kanji.id}`)

            return {
                data: kanji,
                message: KANJI_MESSAGE.CREATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error creating kanji:', error)
            if (error.message.includes('đã tồn tại')) {
                throw error
            }
            throw InvalidKanjiDataException
        }
    }

    async update(id: number, data: UpdateKanjiBodyType) {
        try {
            this.logger.log(`Updating kanji: ${id}`)

            // Kiểm tra kanji có tồn tại không
            const existingKanji = await this.kanjiRepository.findById(id)
            if (!existingKanji) {
                throw KanjiNotFoundException
            }

            // Kiểm tra character đã tồn tại chưa (nếu có thay đổi)
            if (data.character && data.character !== existingKanji.character) {
                const characterExists = await this.kanjiRepository.existsByCharacter(data.character, id)
                if (characterExists) {
                    throw KanjiAlreadyExistsException
                }
            }

            const kanji = await this.kanjiRepository.update(id, data)
            this.logger.log(`Kanji updated successfully: ${kanji.id}`)

            return {
                data: kanji,
                message: KANJI_MESSAGE.UPDATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error updating kanji:', error)
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