import { Module } from '@nestjs/common'
import { FlashcardController } from './flashcard.controller'
import { FlashcardService } from './flashcard.service'
import { FlashcardRepository } from './flashcard.repo'
import { SrsReviewModule } from '@/modules/user-srs-review/srs-review.module'

@Module({
  imports: [SrsReviewModule],
  controllers: [FlashcardController],
  providers: [FlashcardService, FlashcardRepository],
  exports: [FlashcardService, FlashcardRepository]
})
export class FlashcardModule { }

