import { Module } from '@nestjs/common'
import { FlashcardController } from './flashcard.controller'
import { FlashcardService } from './flashcard.service'
import { FlashcardRepository } from './flashcard.repo'
import { FlashcardSearchService } from './flashcard-search.service'
import { SrsReviewModule } from '@/modules/user-srs-review/srs-review.module'

@Module({
  imports: [SrsReviewModule],
  controllers: [FlashcardController],
  providers: [FlashcardService, FlashcardRepository, FlashcardSearchService],
  exports: [FlashcardService, FlashcardRepository, FlashcardSearchService]
})
export class FlashcardModule {}

