import {
    FlashcardLibraryItem,
    FlashcardLibrarySearchQuery,
    FlashcardImportContentTypeEnum
} from './entities/flashcard.entities'
import { FlashcardRepository } from './flashcard.repo'
import { FlashcardDeckNotFoundException } from './dto/flashcard.error'
import { FlashcardMessage } from '@/i18n/message-keys'
import { I18nService } from '@/i18n/i18n.service'
import { Injectable, Logger } from '@nestjs/common'

const DEFAULT_LANG = 'vi'

@Injectable()
export class FlashcardSearchService {
    private readonly logger = new Logger(FlashcardSearchService.name)

    constructor(
        private readonly flashcardRepository: FlashcardRepository,
        private readonly i18n: I18nService
    ) { }

    private translate(key: string, lang: string) {
        return this.i18n.translate(key, lang)
    }

    async searchLibrary(
        deckId: number,
        userId: number,
        query: FlashcardLibrarySearchQuery,
        lang: string = DEFAULT_LANG
    ) {
        const deck = await this.flashcardRepository.findDeckById(deckId, userId)
        if (!deck) {
            throw new FlashcardDeckNotFoundException()
        }

        const { currentPage, pageSize, type, search, jlptLevel, level } = query
        const skip = (currentPage - 1) * pageSize

        let total = 0
        let results: FlashcardLibraryItem[] = []

        if (type === 'VOCABULARY') {
            const { total: count, results: vocabulary } = await this.flashcardRepository.searchVocabulary({
                skip,
                take: pageSize,
                search,
                jlptLevel
            })

            total = count
            const existing = await this.flashcardRepository.findExistingContentCards(
                deckId,
                'VOCABULARY',
                vocabulary.map((item) => item.id)
            )
            const existingSet = new Set(
                existing.map((item) => item.vocabularyId).filter((id): id is number => Boolean(id))
            )

            results = vocabulary.map((item) => ({
                contentType: FlashcardImportContentTypeEnum.Enum.VOCABULARY,
                contentId: item.id,
                title: item.wordJp,
                subtitle: item.reading ?? null,
                jlptLevel: item.levelN ?? null,
                payload: {
                    wordJp: item.wordJp,
                    reading: item.reading,
                    levelN: item.levelN,
                    audioUrl: item.audioUrl
                },
                isAdded: existingSet.has(item.id)
            }))
        } else if (type === 'KANJI') {
            const { total: count, results: kanji } = await this.flashcardRepository.searchKanji({
                skip,
                take: pageSize,
                search,
                jlptLevel
            })

            total = count
            const existing = await this.flashcardRepository.findExistingContentCards(
                deckId,
                'KANJI',
                kanji.map((item) => item.id)
            )
            const existingSet = new Set(
                existing.map((item) => item.kanjiId).filter((id): id is number => Boolean(id))
            )

            results = kanji.map((item) => ({
                contentType: FlashcardImportContentTypeEnum.Enum.KANJI,
                contentId: item.id,
                title: item.character,
                subtitle: item.meaningKey ?? null,
                jlptLevel: item.jlptLevel ?? null,
                payload: {
                    character: item.character,
                    meaningKey: item.meaningKey,
                    jlptLevel: item.jlptLevel,
                    img: item.img
                },
                isAdded: existingSet.has(item.id)
            }))
        } else {
            const { total: count, results: grammar } = await this.flashcardRepository.searchGrammar({
                skip,
                take: pageSize,
                search,
                level
            })

            total = count
            const existing = await this.flashcardRepository.findExistingContentCards(
                deckId,
                'GRAMMAR',
                grammar.map((item) => item.id)
            )
            const existingSet = new Set(
                existing.map((item) => item.grammarId).filter((id): id is number => Boolean(id))
            )

            results = grammar.map((item) => ({
                contentType: FlashcardImportContentTypeEnum.Enum.GRAMMAR,
                contentId: item.id,
                title: item.structure,
                subtitle: item.level ?? null,
                jlptLevel: null,
                payload: {
                    structure: item.structure,
                    level: item.level
                },
                isAdded: existingSet.has(item.id)
            }))
        }

        return {
            statusCode: 200,
            message: this.translate(FlashcardMessage.GET_LIBRARY_SUCCESS, lang),
            data: {
                results,
                pagination: {
                    current: currentPage,
                    pageSize,
                    totalItem: total,
                    totalPage: Math.ceil(total / pageSize)
                }
            }
        }
    }
}

