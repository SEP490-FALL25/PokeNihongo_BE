import { BadRequestException, HttpException, Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { ListSrsQueryDto, ReviewActionDto, UpsertSrsReviewDto } from './dto/srs-review.zod-dto'
import { SrsReviewRepository } from './srs-review.repo'
import { TranslationHelperService } from '@/modules/translation/translation.helper.service'
import { ForbiddenSrsAccessException, InvalidSrsDataException, SrsNotFoundException } from './dto/srs-review.error'
import { SRS_REVIEW_MESSAGE } from '@/common/constants/message'
import { isForeignKeyConstraintPrismaError, isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'

@Injectable()
export class SrsReviewService {
    private readonly logger = new Logger(SrsReviewService.name)
    constructor(private readonly prisma: PrismaService, private readonly repo: SrsReviewRepository, private readonly translationHelper: TranslationHelperService) { }

    async list(userId: number, query: ListSrsQueryDto) {
        try {
            const q: any = query as any
            const where: any = { userId }
            if (q?.type) where.contentType = String(q.type).toUpperCase()
            if (q?.dueOnly) where.nextReviewDate = { lte: new Date() }
            const rows = await this.repo.list(where, 200)
            return {
                statusCode: 200,
                message: SRS_REVIEW_MESSAGE.GET_LIST_SUCCESS,
                data: {
                    results: rows,
                    pagination: {
                        current: 1,
                        pageSize: rows.length,
                        totalPage: 1,
                        totalItem: rows.length
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error listing SRS reviews:', error)
            if (isNotFoundPrismaError(error)) throw SrsNotFoundException
            if (isUniqueConstraintPrismaError(error) || isForeignKeyConstraintPrismaError(error)) throw InvalidSrsDataException
            if (error instanceof HttpException) throw error
            throw InvalidSrsDataException
        }
    }

    async getOne(userId: number, type: string, id: number) {
        try {
            const row = await this.repo.findUnique(userId, String(type).toUpperCase(), id)
            return {
                statusCode: 200,
                message: SRS_REVIEW_MESSAGE.GET_SUCCESS,
                data: row
            }
        } catch (error) {
            this.logger.error('Error getting SRS review:', error)
            if (isNotFoundPrismaError(error)) throw SrsNotFoundException
            if (isUniqueConstraintPrismaError(error) || isForeignKeyConstraintPrismaError(error)) throw InvalidSrsDataException
            if (error instanceof HttpException) throw error
            throw InvalidSrsDataException
        }
    }

    async listToday(userId: number) {
        try {
            const rows = await this.repo.listForDate(userId, new Date())
            return {
                statusCode: 200,
                message: SRS_REVIEW_MESSAGE.GET_LIST_SUCCESS,
                data: {
                    results: rows,
                    pagination: {
                        current: 1,
                        pageSize: rows.length,
                        totalPage: 1,
                        totalItem: rows.length
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error listing today SRS reviews:', error)
            if (isNotFoundPrismaError(error)) throw SrsNotFoundException
            if (isUniqueConstraintPrismaError(error) || isForeignKeyConstraintPrismaError(error)) throw InvalidSrsDataException
            if (error instanceof HttpException) throw error
            throw InvalidSrsDataException
        }
    }

    async markRead(userId: number, srsId: number) {
        try {
            const row = await this.repo.findById(srsId)
            if (!row) throw SrsNotFoundException
            if (row.userId !== userId) throw ForbiddenSrsAccessException
            const updated = await this.repo.updateById(srsId, { isRead: true })
            return {
                statusCode: 200,
                message: SRS_REVIEW_MESSAGE.UPDATE_SUCCESS,
                data: updated
            }
        } catch (error) {
            this.logger.error('Error marking SRS as read:', error)
            if (isNotFoundPrismaError(error)) throw SrsNotFoundException
            if (isUniqueConstraintPrismaError(error) || isForeignKeyConstraintPrismaError(error)) throw InvalidSrsDataException
            if (error instanceof HttpException) throw error
            throw InvalidSrsDataException
        }
    }

    async getContentDetail(userId: number, type: string, id: number, languageCode: string) {
        const t = String(type).toUpperCase()
        const lang = (languageCode || 'vi').toLowerCase()
        if (t === 'GRAMMAR') {
            const grammar = await (this.prisma as any).grammar.findUnique({ where: { id } })
            if (!grammar) return null
            const usages = await (this.prisma as any).grammarUsage.findMany({ where: { grammarId: id }, orderBy: { id: 'asc' } })
            const mappedUsages = [] as any[]
            for (const u of usages) {
                const explanation = u.explanationKey
                    ? ((await this.translationHelper.getTranslation(u.explanationKey, lang))
                        || (await this.translationHelper.getTranslation(u.explanationKey, 'vi')))
                    : null
                const example = u.exampleSentenceKey
                    ? ((await this.translationHelper.getTranslation(u.exampleSentenceKey, lang))
                        || (await this.translationHelper.getTranslation(u.exampleSentenceKey, 'vi')))
                    : null
                mappedUsages.push({
                    id: u.id,
                    explanationKey: u.explanationKey,
                    exampleSentenceKey: u.exampleSentenceKey,
                    explanation,
                    exampleSentence: example
                })
            }
            return {
                type: 'grammar',
                id: grammar.id,
                structure: grammar.structure,
                level: grammar.level,
                usages: mappedUsages
            }
        }
        if (t === 'KANJI') {
            const kanji = await (this.prisma as any).kanji.findUnique({ where: { id } })
            if (!kanji) return null
            let meaning: string | null = null
            if (kanji.meaningKey) {
                meaning = (await this.translationHelper.getTranslation(kanji.meaningKey, lang))
                    || (await this.translationHelper.getTranslation(kanji.meaningKey, 'vi'))
            }
            return {
                type: 'kanji',
                id: kanji.id,
                character: kanji.character,
                meaning,
                jlptLevel: kanji.jlptLevel
            }
        }
        return { type: t.toLowerCase(), id }
    }

    async getDetailBySrsId(userId: number, srsId: number, languageCode: string) {
        try {
            const srs = await this.repo.findById(srsId)
            if (!srs) throw SrsNotFoundException
            if (srs.userId !== userId) throw ForbiddenSrsAccessException
            const content = await this.getContentDetail(userId, srs.contentType, srs.contentId, languageCode)
            // Ẩn các field không cần trả về từ srs
            const { id, userId: srsUserId, message, srsLevel, incorrectStreak, isLeech, isRead } = srs as any
            const sanitizedSrs = { id, userId: srsUserId, message, srsLevel, incorrectStreak, isLeech, isRead }
            return {
                statusCode: 200,
                message: SRS_REVIEW_MESSAGE.GET_SUCCESS,
                data: { srs: sanitizedSrs, content }
            }
        } catch (error) {
            this.logger.error('Error getting SRS detail by id:', error)
            if (isNotFoundPrismaError(error)) throw SrsNotFoundException
            if (isUniqueConstraintPrismaError(error) || isForeignKeyConstraintPrismaError(error)) throw InvalidSrsDataException
            if (error instanceof HttpException) throw error
            throw InvalidSrsDataException
        }
    }

    async upsert(userId: number, body: UpsertSrsReviewDto) {
        try {
            const b: any = body as any
            const contentType = String(b.contentType).toUpperCase()
            const contentId = Number(b.contentId)
            if (!contentId) throw new BadRequestException('contentId invalid')
            const data = await this.repo.upsert(userId, contentType, contentId, b.message)
            return {
                statusCode: 200,
                message: SRS_REVIEW_MESSAGE.UPSERT_SUCCESS,
                data
            }
        } catch (error) {
            this.logger.error('Error upserting SRS:', error)
            if (isNotFoundPrismaError(error)) throw SrsNotFoundException
            if (isUniqueConstraintPrismaError(error) || isForeignKeyConstraintPrismaError(error)) throw InvalidSrsDataException
            if (error instanceof HttpException) throw error
            throw InvalidSrsDataException
        }
    }

    async applyReview(userId: number, type: string, id: number, body: ReviewActionDto) {
        try {
            const existingRes = await this.getOne(userId, type, id)
            const existing: any = (existingRes as any)?.data
            if (!existing) {
                await this.upsert(userId, { contentType: String(type).toUpperCase() as any, contentId: id })
            }

            const b: any = body as any
            const isCorrect = b.result === 'correct'
            // Simple schedule: level -> days
            const scheduleDays = [1, 3, 7, 14, 30, 60, 120]

            let nextLevel = isCorrect ? Math.min((existing?.srsLevel ?? 0) + 1, scheduleDays.length - 1) : 0
            let incorrectStreak = isCorrect ? 0 : (existing?.incorrectStreak ?? 0) + 1
            const isLeech = incorrectStreak >= 5

            const nextDate = new Date()
            if (isCorrect) {
                const days = scheduleDays[nextLevel] || 1
                nextDate.setDate(nextDate.getDate() + days)
            } else {
                // review lại vào ngày hôm sau khi sai
                nextDate.setDate(nextDate.getDate() + 1)
            }

            const updated = await this.repo.update(userId, String(type).toUpperCase(), id, {
                srsLevel: nextLevel,
                nextReviewDate: nextDate,
                incorrectStreak,
                isLeech,
                message: b.message ?? undefined
            })

            return {
                statusCode: 200,
                message: SRS_REVIEW_MESSAGE.UPDATE_SUCCESS,
                data: updated
            }
        } catch (error) {
            this.logger.error('Error applying SRS review result:', error)
            if (isNotFoundPrismaError(error)) throw SrsNotFoundException
            if (isUniqueConstraintPrismaError(error) || isForeignKeyConstraintPrismaError(error)) throw InvalidSrsDataException
            if (error instanceof HttpException) throw error
            throw InvalidSrsDataException
        }
    }
}


