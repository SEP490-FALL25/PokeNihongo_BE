import {
    CreateFlashcardCardBody,
    CreateFlashcardDeckBody,
    FlashcardCard,
    FlashcardContentType,
    FlashcardDeckDetail,
    FlashcardDeckSummary,
    FlashcardImportContentTypeEnum,
    FlashcardImportResult,
    FlashcardReviewActionBody,
    FlashcardReviewItem,
    FlashcardReviewQuery,
    GetFlashcardCardListQuery,
    GetFlashcardDeckListQuery,
    ImportFlashcardCardsBody,
    UpdateFlashcardCardBody,
    UpdateFlashcardDeckBody
} from './entities/flashcard.entities'
import {
    FlashcardCardNotFoundException,
    FlashcardContentAlreadyExistsException,
    FlashcardDeckNotFoundException,
    InvalidFlashcardImportException
} from './dto/flashcard.error'
import { FlashcardMessage } from '@/i18n/message-keys'
import { FlashcardRepository } from './flashcard.repo'
import { I18nService } from '@/i18n/i18n.service'
import { Injectable, Logger } from '@nestjs/common'
import { Prisma, FlashcardContentType as PrismaFlashcardContentType } from '@prisma/client'
import { SrsReviewService } from '@/modules/user-srs-review/srs-review.service'

const DEFAULT_LANG = 'vi'

@Injectable()
export class FlashcardService {
    private readonly logger = new Logger(FlashcardService.name)

    constructor(
        private readonly flashcardRepository: FlashcardRepository,
        private readonly srsReviewService: SrsReviewService,
        private readonly i18n: I18nService
    ) { }

    private translate(key: string, lang: string) {
        return this.i18n.translate(key, lang)
    }

    private mapDeck(deck: any, totalCards: number): FlashcardDeckSummary {
        return {
            id: deck.id,
            userId: deck.userId,
            name: deck.name,
            status: deck.status,
            source: deck.source,
            metadata: deck.metadata ?? null,
            deletedAt: deck.deletedAt,
            createdAt: deck.createdAt,
            updatedAt: deck.updatedAt,
            totalCards
        }
    }

    private mapCard(card: any): FlashcardCard {
        return {
            id: card.id,
            deckId: card.deckId,
            contentType: card.contentType,
            status: card.status,
            vocabularyId: card.vocabularyId,
            kanjiId: card.kanjiId,
            grammarId: card.grammarId,
            vocabulary: card.vocabulary
                ? {
                    id: card.vocabulary.id,
                    wordJp: card.vocabulary.wordJp,
                    reading: card.vocabulary.reading,
                    levelN: card.vocabulary.levelN,
                    audioUrl: card.vocabulary.audioUrl ?? null
                }
                : null,
            kanji: card.kanji
                ? {
                    id: card.kanji.id,
                    character: card.kanji.character,
                    meaningKey: card.kanji.meaningKey,
                    jlptLevel: card.kanji.jlptLevel,
                    img: card.kanji.img ?? null
                }
                : null,
            grammar: card.grammar
                ? {
                    id: card.grammar.id,
                    structure: card.grammar.structure,
                    level: card.grammar.level
                }
                : null,
            notes: card.notes,
            deletedAt: card.deletedAt,
            createdAt: card.createdAt,
            updatedAt: card.updatedAt
        }
    }

    private resolveContentId(card: any): number | null {
        if (card.contentType === 'VOCABULARY') {
            return card.vocabularyId ?? null
        }
        if (card.contentType === 'KANJI') {
            return card.kanjiId ?? null
        }
        if (card.contentType === 'GRAMMAR') {
            return card.grammarId ?? null
        }
        return null
    }

    private mapSrsEntry(entry: any) {
        if (!entry) return null
        return {
            id: entry.id,
            srsLevel: entry.srsLevel,
            nextReviewDate: entry.nextReviewDate,
            incorrectStreak: entry.incorrectStreak,
            isLeech: entry.isLeech,
            message: entry.message ?? null
        }
    }

    async createDeck(userId: number, body: CreateFlashcardDeckBody, lang: string = DEFAULT_LANG) {
        const deck = await this.flashcardRepository.createDeck(userId, body)

        return {
            statusCode: 201,
            message: this.translate(FlashcardMessage.CREATE_DECK_SUCCESS, lang),
            data: this.mapDeck(deck, 0)
        }
    }

    async getDecks(userId: number, query: GetFlashcardDeckListQuery, lang: string = DEFAULT_LANG) {
        const { currentPage, pageSize } = query
        const { total, decks, cardCountMap } = await this.flashcardRepository.findDecks(userId, query)

        const results: FlashcardDeckSummary[] = decks.map((deck) =>
            this.mapDeck(deck, cardCountMap.get(deck.id) ?? 0)
        )

        return {
            statusCode: 200,
            message: this.translate(FlashcardMessage.GET_DECK_LIST_SUCCESS, lang),
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

    async getDeckById(deckId: number, userId: number, lang: string = DEFAULT_LANG) {
        const deckWithCards = await this.flashcardRepository.findDeckWithRelations(deckId, userId)
        if (!deckWithCards) {
            throw new FlashcardDeckNotFoundException()
        }

        const totalCards = deckWithCards.cards?.length ?? 0
        const payload: FlashcardDeckDetail = {
            ...this.mapDeck(deckWithCards, totalCards),
            cards: deckWithCards.cards?.map((card) => this.mapCard(card))
        }

        return {
            statusCode: 200,
            message: this.translate(FlashcardMessage.GET_DECK_SUCCESS, lang),
            data: payload
        }
    }

    async updateDeck(
        deckId: number,
        userId: number,
        body: UpdateFlashcardDeckBody,
        lang: string = DEFAULT_LANG
    ) {
        const existingDeck = await this.flashcardRepository.findDeckById(deckId, userId)
        if (!existingDeck) {
            throw new FlashcardDeckNotFoundException()
        }

        const updatedDeck = await this.flashcardRepository.updateDeck(deckId, body)
        const totalCards = await this.flashcardRepository.countDeckCards(deckId)

        return {
            statusCode: 200,
            message: this.translate(FlashcardMessage.UPDATE_DECK_SUCCESS, lang),
            data: this.mapDeck(updatedDeck, totalCards)
        }
    }

    async deleteDeck(deckId: number, userId: number, lang: string = DEFAULT_LANG) {
        const existingDeck = await this.flashcardRepository.findDeckById(deckId, userId)
        if (!existingDeck) {
            throw new FlashcardDeckNotFoundException()
        }

        await this.flashcardRepository.softDeleteDeck(deckId)

        return {
            statusCode: 200,
            message: this.translate(FlashcardMessage.DELETE_DECK_SUCCESS, lang),
            data: null
        }
    }

    async getDeckCards(
        deckId: number,
        userId: number,
        query: GetFlashcardCardListQuery,
        lang: string = DEFAULT_LANG
    ) {
        const deck = await this.flashcardRepository.findDeckById(deckId, userId)
        if (!deck) {
            throw new FlashcardDeckNotFoundException()
        }

        const { currentPage, pageSize } = query
        const { total, cards } = await this.flashcardRepository.findDeckCards(deckId, query)

        return {
            statusCode: 200,
            message: this.translate(FlashcardMessage.GET_DECK_SUCCESS, lang),
            data: {
                results: cards.map((card) => this.mapCard(card)),
                pagination: {
                    current: currentPage,
                    pageSize,
                    totalItem: total,
                    totalPage: Math.ceil(total / pageSize)
                }
            }
        }
    }

    private async ensureContentAvailability(
        deckId: number,
        contentType: string,
        contentId: number
    ): Promise<{
        vocabulary?: { id: number; wordJp: string; reading: string | null; levelN: number | null }
        kanji?: { id: number; character: string; meaningKey: string; jlptLevel: number | null }
        grammar?: { id: number; structure: string; level: string | null }
    }> {
        if (contentType === 'CUSTOM') {
            return {}
        }

        if (contentType === 'VOCABULARY') {
            const duplicates = await this.flashcardRepository.findExistingContentCards(
                deckId,
                contentType,
                [contentId]
            )
            if (duplicates.length > 0) {
                throw new FlashcardContentAlreadyExistsException()
            }

            const [record] = await this.flashcardRepository.findVocabularyByIds([contentId])
            if (!record) {
                throw new InvalidFlashcardImportException()
            }

            return { vocabulary: record }
        }

        if (contentType === 'KANJI') {
            const duplicates = await this.flashcardRepository.findExistingContentCards(
                deckId,
                contentType,
                [contentId]
            )
            if (duplicates.length > 0) {
                throw new FlashcardContentAlreadyExistsException()
            }

            const [record] = await this.flashcardRepository.findKanjiByIds([contentId])
            if (!record) {
                throw new InvalidFlashcardImportException()
            }

            return { kanji: record }
        }

        if (contentType === 'GRAMMAR') {
            const duplicates = await this.flashcardRepository.findExistingContentCards(
                deckId,
                contentType,
                [contentId]
            )
            if (duplicates.length > 0) {
                throw new FlashcardContentAlreadyExistsException()
            }

            const [record] = await this.flashcardRepository.findGrammarByIds([contentId])
            if (!record) {
                throw new InvalidFlashcardImportException()
            }

            return { grammar: record }
        }

        throw new InvalidFlashcardImportException()
    }

    async createCard(
        deckId: number,
        userId: number,
        body: CreateFlashcardCardBody,
        lang: string = DEFAULT_LANG
    ) {
        const deck = await this.flashcardRepository.findDeckById(deckId, userId)
        if (!deck) {
            throw new FlashcardDeckNotFoundException()
        }

        // Map id + contentType thành vocabularyId/kanjiId/grammarId
        let contentRef: {
            vocabulary?: { id: number; wordJp: string; reading: string | null; levelN: number | null }
            kanji?: { id: number; character: string; meaningKey: string; jlptLevel: number | null }
            grammar?: { id: number; structure: string; level: string | null }
        } = {}

        if (body.contentType !== 'CUSTOM' && body.id) {
            contentRef = await this.ensureContentAvailability(deckId, body.contentType, body.id)
        }

        // Tạo payload với vocabularyId/kanjiId/grammarId được map từ id
        const payload: any = {
            contentType: body.contentType,
            notes: body.notes
        }

        // Map id thành đúng field dựa vào contentType
        if (body.contentType === 'VOCABULARY' && body.id) {
            payload.vocabularyId = body.id
        } else if (body.contentType === 'KANJI' && body.id) {
            payload.kanjiId = body.id
        } else if (body.contentType === 'GRAMMAR' && body.id) {
            payload.grammarId = body.id
        }

        const card = await this.flashcardRepository.createCard(deckId, payload)

        return {
            statusCode: 201,
            message: this.translate(FlashcardMessage.CREATE_CARD_SUCCESS, lang),
            data: this.mapCard(card)
        }
    }

    async updateCard(
        deckId: number,
        cardId: number,
        userId: number,
        body: UpdateFlashcardCardBody,
        lang: string = DEFAULT_LANG
    ) {
        const card = await this.flashcardRepository.findCardById(cardId, deckId, userId)
        if (!card) {
            throw new FlashcardCardNotFoundException()
        }

        const updated = await this.flashcardRepository.updateCard(cardId, body)

        return {
            statusCode: 200,
            message: this.translate(FlashcardMessage.UPDATE_CARD_SUCCESS, lang),
            data: this.mapCard(updated)
        }
    }

    async deleteCard(deckId: number, cardId: number, userId: number, lang: string = DEFAULT_LANG) {
        const card = await this.flashcardRepository.findCardById(cardId, deckId, userId)
        if (!card) {
            throw new FlashcardCardNotFoundException()
        }

        await this.flashcardRepository.softDeleteCard(cardId)

        return {
            statusCode: 200,
            message: this.translate(FlashcardMessage.DELETE_CARD_SUCCESS, lang),
            data: null
        }
    }

    async importCards(
        deckId: number,
        userId: number,
        body: ImportFlashcardCardsBody,
        lang: string = DEFAULT_LANG
    ) {
        const deck = await this.flashcardRepository.findDeckById(deckId, userId)
        if (!deck) {
            throw new FlashcardDeckNotFoundException()
        }

        const summary: FlashcardImportResult = {
            imported: 0,
            skipped: 0,
            missing: 0,
            duplicates: []
        }

        const createPayloads: Prisma.FlashcardCardUncheckedCreateInput[] = []

        const groupByType = body.items.reduce<Record<FlashcardContentType, number[]>>((acc, item) => {
            const type = item.contentType as FlashcardContentType
            if (!acc[type]) {
                acc[type] = []
            }
            acc[type].push(item.contentId)
            return acc
        }, {} as Record<FlashcardContentType, number[]>)

        for (const [type, ids] of Object.entries(groupByType) as [FlashcardContentType, number[]][]) {
            const uniqueIds = Array.from(new Set(ids))
            if (uniqueIds.length === 0) {
                continue
            }

            const existingCards = await this.flashcardRepository.findExistingContentCards(
                deckId,
                type,
                uniqueIds
            )

            const existingIdSet = new Set<number>()
            existingCards.forEach((card) => {
                const contentId = card.vocabularyId ?? card.kanjiId ?? card.grammarId
                if (contentId) {
                    existingIdSet.add(contentId)
                    summary.duplicates.push({
                        contentType: FlashcardImportContentTypeEnum.parse(type),
                        contentId
                    })
                }
            })

            summary.skipped += existingIdSet.size

            let records: Array<{ id: number }> = []
            if (type === 'VOCABULARY') {
                records = await this.flashcardRepository.findVocabularyByIds(uniqueIds)
            }
            if (type === 'KANJI') {
                records = await this.flashcardRepository.findKanjiByIds(uniqueIds)
            }
            if (type === 'GRAMMAR') {
                records = await this.flashcardRepository.findGrammarByIds(uniqueIds)
            }

            const availableMap = new Map<number, any>()
            records.forEach((record) => {
                availableMap.set(record.id, record)
            })

            const missingIds = uniqueIds.filter((id) => !availableMap.has(id))
            summary.missing += missingIds.length

            const creatableIds = uniqueIds.filter(
                (id) => availableMap.has(id) && !existingIdSet.has(id)
            )

            creatableIds.forEach((contentId) => {
                const baseData: Prisma.FlashcardCardUncheckedCreateInput = {
                    deckId,
                    contentType: type as PrismaFlashcardContentType,
                    vocabularyId: type === 'VOCABULARY' ? contentId : null,
                    kanjiId: type === 'KANJI' ? contentId : null,
                    grammarId: type === 'GRAMMAR' ? contentId : null,
                    notes: null
                }

                createPayloads.push(baseData)
            })
        }

        const createdCards = await this.flashcardRepository.createManyCards(createPayloads)
        summary.imported = createdCards.length

        return {
            statusCode: 200,
            message: this.translate(FlashcardMessage.IMPORT_CARD_SUCCESS, lang),
            data: {
                summary,
                results: createdCards.map((card) => this.mapCard(card))
            }
        }
    }

    async getReviewCards(
        deckId: number,
        userId: number,
        query: FlashcardReviewQuery,
        lang: string = DEFAULT_LANG
    ) {
        const deck = await this.flashcardRepository.findDeckById(deckId, userId)
        if (!deck) {
            throw new FlashcardDeckNotFoundException()
        }

        const limit = query.limit ?? 20
        const targetTypes: Array<Exclude<FlashcardContentType, 'CUSTOM'>> = [
            'VOCABULARY',
            'KANJI',
            'GRAMMAR'
        ]
        const rawCards = await this.flashcardRepository.findCardsForReview(deckId, targetTypes, limit)

        type NonCustomType = Exclude<FlashcardContentType, 'CUSTOM'>
        const typeToIds: Record<NonCustomType, number[]> = {
            VOCABULARY: [],
            KANJI: [],
            GRAMMAR: []
        }

        for (const card of rawCards) {
            if (card.contentType === 'CUSTOM') continue
            const type = card.contentType as NonCustomType
            const contentId = this.resolveContentId(card)
            if (contentId) {
                typeToIds[type].push(contentId)
            }
        }

        const srsMap = new Map<string, any>()
        for (const type of targetTypes) {
            const ids = Array.from(new Set(typeToIds[type]))
            if (!ids.length) continue
            const entries = await this.flashcardRepository.findSrsEntries(userId, type, ids)
            entries.forEach((entry) => {
                const key = `${type}:${entry.contentId}`
                srsMap.set(key, entry)
            })
        }

        const now = new Date()
        const dueCards: FlashcardReviewItem[] = []

        for (const card of rawCards) {
            if (dueCards.length >= limit) break

            if (card.contentType === 'CUSTOM') {
                dueCards.push({
                    ...this.mapCard(card),
                    srs: null
                })
                continue
            }

            const contentId = this.resolveContentId(card)
            if (!contentId) continue

            const key = `${card.contentType}:${contentId}`
            const srsEntry = srsMap.get(key)
            const isDue = !srsEntry || srsEntry.nextReviewDate <= now
            if (!isDue) continue

            dueCards.push({
                ...this.mapCard(card),
                srs: this.mapSrsEntry(srsEntry)
            })
        }

        return {
            statusCode: 200,
            message: this.translate(FlashcardMessage.GET_REVIEW_LIST_SUCCESS, lang),
            data: {
                results: dueCards,
                pagination: {
                    current: 1,
                    pageSize: dueCards.length,
                    totalPage: 1,
                    totalItem: dueCards.length
                }
            }
        }
    }

    async reviewCard(
        deckId: number,
        cardId: number,
        userId: number,
        body: FlashcardReviewActionBody,
        lang: string = DEFAULT_LANG
    ) {
        const card = await this.flashcardRepository.findCardById(cardId, deckId, userId)
        if (!card) {
            throw new FlashcardCardNotFoundException()
        }

        const contentId = this.resolveContentId(card)

        if (card.contentType !== 'CUSTOM' && contentId) {
            await this.srsReviewService.applyReview(userId, card.contentType, contentId, {
                result: body.result,
                message: body.message
            })
        }

        const updatedEntry =
            card.contentType !== 'CUSTOM' && contentId
                ? (
                    await this.flashcardRepository.findSrsEntries(
                        userId,
                        card.contentType as Exclude<FlashcardContentType, 'CUSTOM'>,
                        [contentId]
                    )
                )[0]
                : null

        return {
            statusCode: 200,
            message: this.translate(FlashcardMessage.REVIEW_CARD_SUCCESS, lang),
            data: {
                card: this.mapCard(card),
                srs: this.mapSrsEntry(updatedEntry)
            }
        }
    }

    async exportDeck(deckId: number, userId: number, lang: string = DEFAULT_LANG) {
        const deckWithCards = await this.flashcardRepository.findDeckWithRelations(deckId, userId)
        if (!deckWithCards) {
            throw new FlashcardDeckNotFoundException()
        }

        const cards = deckWithCards.cards?.map((card) => this.mapCard(card)) ?? []
        const audioAssets = new Set<string>()
        const imageAssets = new Set<string>()

        for (const card of cards) {
            if (card.vocabulary?.audioUrl) audioAssets.add(card.vocabulary.audioUrl)
            if (card.kanji?.img) imageAssets.add(card.kanji.img)
        }

        return {
            statusCode: 200,
            message: this.translate(FlashcardMessage.EXPORT_DECK_SUCCESS, lang),
            data: {
                deck: this.mapDeck(deckWithCards, cards.length),
                cards,
                assets: {
                    audio: Array.from(audioAssets).filter(Boolean),
                    images: Array.from(imageAssets).filter(Boolean)
                },
                generatedAt: new Date()
            }
        }
    }
}

