import {
  CreateFlashcardCardBodyDTO,
  CreateFlashcardDeckBodyDTO,
  FlashcardDeckCardParamsDTO,
  FlashcardDeckParamsDTO,
  GetFlashcardCardListQueryDTO,
  GetFlashcardDeckListQueryDTO,
  ImportFlashcardCardsBodyDTO,
  FlashcardLibrarySearchQueryDTO,
  FlashcardReviewActionBodyDTO,
  FlashcardReviewQueryDTO,
  UpdateFlashcardCardBodyDTO,
  UpdateFlashcardDeckBodyDTO
} from './dto/flashcard.zod-dto'
import {
  CreateFlashcardCardBody,
  CreateFlashcardDeckBody,
  GetFlashcardCardListQuery,
  GetFlashcardDeckListQuery,
  ImportFlashcardCardsBody,
  FlashcardLibrarySearchQuery,
  FlashcardReviewActionBody,
  FlashcardReviewQuery,
  UpdateFlashcardCardBody,
  UpdateFlashcardDeckBody
} from './entities/flashcard.entities'
import { FlashcardService } from './flashcard.service'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateFlashcardCardSwaggerDTO,
  CreateFlashcardDeckSwaggerDTO,
  FlashcardImportCardsBodySwaggerDTO,
  FlashcardLibrarySearchQuerySwaggerDTO,
  FlashcardReviewActionSwaggerDTO,
  FlashcardReviewQuerySwaggerDTO,
  GetFlashcardCardListQuerySwaggerDTO,
  GetFlashcardDeckListQuerySwaggerDTO,
  UpdateFlashcardCardSwaggerDTO,
  UpdateFlashcardDeckSwaggerDTO
} from './dto/flashcard.dto'

@ApiTags('Flashcards')
@ApiBearerAuth()
@Controller('flashcards')
export class FlashcardController {
  constructor(
    private readonly flashcardService: FlashcardService,
  ) { }

  @Post('decks')
  @ApiOperation({ summary: 'Tạo bộ flashcard mới' })
  @ApiResponse({ status: 201, type: MessageResDTO })
  @ApiBody({ type: CreateFlashcardDeckSwaggerDTO })
  @ZodSerializerDto(MessageResDTO)
  async createDeck(
    @Body() body: CreateFlashcardDeckBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.createDeck(
      userId,
      body as CreateFlashcardDeckBody,
      lang ?? undefined
    )
  }

  @Get('decks')
  @ApiOperation({ summary: 'Lấy danh sách bộ flashcard của người dùng' })
  @ApiResponse({ status: 200, type: PaginationResponseDTO })
  @ApiQuery({ type: GetFlashcardDeckListQuerySwaggerDTO })
  @ZodSerializerDto(PaginationResponseDTO)
  async getDecks(
    @Query() query: GetFlashcardDeckListQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.getDecks(userId, query, lang ?? undefined)
  }

  @Get('decks/:deckId')
  @ApiOperation({ summary: 'Lấy chi tiết bộ flashcard (kèm danh sách thẻ)' })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ZodSerializerDto(MessageResDTO)
  async getDeckById(
    @Param('deckId') id: number,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.getDeckById(Number(id), userId, lang ?? undefined)
  }

  @Get('decks/:deckId/export')
  @ApiOperation({ summary: 'Xuất dữ liệu bộ flashcard (phục vụ offline cache)' })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ZodSerializerDto(MessageResDTO)
  async exportDeck(
    @Param() params: FlashcardDeckParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.exportDeck(params.deckId, userId, lang ?? undefined)
  }

  @Patch('decks/:deckId')
  @ApiOperation({ summary: 'Cập nhật thông tin bộ flashcard' })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ApiBody({ type: UpdateFlashcardDeckSwaggerDTO })
  @ZodSerializerDto(MessageResDTO)
  async updateDeck(
    @Param() params: FlashcardDeckParamsDTO,
    @Body() body: UpdateFlashcardDeckBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.updateDeck(
      params.deckId,
      userId,
      body as UpdateFlashcardDeckBody,
      lang ?? undefined
    )
  }

  @Delete('decks/:deckId')
  @ApiOperation({ summary: 'Xóa (soft delete) bộ flashcard' })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ZodSerializerDto(MessageResDTO)
  async deleteDeck(
    @Param() params: FlashcardDeckParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.deleteDeck(params.deckId, userId, lang ?? undefined)
  }

  @Get('decks/:deckId/cards')
  @ApiOperation({ summary: 'Lấy danh sách thẻ trong bộ flashcard' })
  @ApiResponse({ status: 200, type: PaginationResponseDTO })
  @ApiQuery({ type: GetFlashcardCardListQuerySwaggerDTO })
  @ZodSerializerDto(PaginationResponseDTO)
  async getDeckCards(
    @Param() params: FlashcardDeckParamsDTO,
    @Query() query: GetFlashcardCardListQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.getDeckCards(
      params.deckId,
      userId,
      query as GetFlashcardCardListQuery,
      lang ?? undefined
    )
  }

  @Post('decks/:deckId/cards')
  @ApiOperation({ summary: 'Thêm một thẻ mới vào bộ flashcard' })
  @ApiResponse({ status: 201, type: MessageResDTO })
  @ApiBody({ type: CreateFlashcardCardSwaggerDTO })
  @ZodSerializerDto(MessageResDTO)
  async createCard(
    @Param() params: FlashcardDeckParamsDTO,
    @Body() body: CreateFlashcardCardBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.createCard(
      params.deckId,
      userId,
      body as CreateFlashcardCardBody,
      lang ?? undefined
    )
  }

  @Patch('decks/:deckId/cards/:cardId')
  @ApiOperation({ summary: 'Cập nhật thông tin thẻ flashcard' })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ApiBody({ type: UpdateFlashcardCardSwaggerDTO })
  @ZodSerializerDto(MessageResDTO)
  async updateCard(
    @Param() params: FlashcardDeckCardParamsDTO,
    @Body() body: UpdateFlashcardCardBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.updateCard(
      params.deckId,
      params.cardId,
      userId,
      body as UpdateFlashcardCardBody,
      lang ?? undefined
    )
  }

  @Delete('decks/:deckId/cards/:cardId')
  @ApiOperation({ summary: 'Xóa (soft delete) một thẻ flashcard' })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ZodSerializerDto(MessageResDTO)
  async deleteCard(
    @Param() params: FlashcardDeckCardParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.deleteCard(params.deckId, params.cardId, userId, lang ?? undefined)
  }

  @Post('decks/:deckId/cards/import')
  @ApiOperation({ summary: 'Import nhiều thẻ từ Vocabulary/Kanji/Grammar vào bộ flashcard' })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ApiBody({ type: FlashcardImportCardsBodySwaggerDTO })
  @ZodSerializerDto(MessageResDTO)
  async importCards(
    @Param() params: FlashcardDeckParamsDTO,
    @Body() body: ImportFlashcardCardsBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.importCards(
      params.deckId,
      userId,
      body as ImportFlashcardCardsBody,
      lang ?? undefined
    )
  }

  @Get('decks/:deckId/review')
  @ApiOperation({ summary: 'Lấy danh sách thẻ đến hạn ôn tập (SRS)' })
  @ApiResponse({ status: 200, type: PaginationResponseDTO })
  @ApiQuery({ type: FlashcardReviewQuerySwaggerDTO })
  @ZodSerializerDto(PaginationResponseDTO)
  async getReviewCards(
    @Param() params: FlashcardDeckParamsDTO,
    @Query() query: FlashcardReviewQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.getReviewCards(
      params.deckId,
      userId,
      query as FlashcardReviewQuery,
      lang ?? undefined
    )
  }

  @Post('decks/:deckId/cards/:cardId/review')
  @ApiOperation({ summary: 'Ghi nhận kết quả ôn tập của một thẻ flashcard' })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ApiBody({ type: FlashcardReviewActionSwaggerDTO })
  @ZodSerializerDto(MessageResDTO)
  async reviewCard(
    @Param() params: FlashcardDeckCardParamsDTO,
    @Body() body: FlashcardReviewActionBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.reviewCard(
      params.deckId,
      params.cardId,
      userId,
      body as FlashcardReviewActionBody,
      lang ?? undefined
    )
  }
}

