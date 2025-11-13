import { createZodDto } from 'nestjs-zod'
import { ListSrsQueryType, ReviewActionBodyType, UpsertSrsReviewBodyType } from '../entities/srs-review.entities'

export class UpsertSrsReviewDto extends createZodDto(UpsertSrsReviewBodyType) { }
export class ReviewActionDto extends createZodDto(ReviewActionBodyType) { }
export class ListSrsQueryDto extends createZodDto(ListSrsQueryType) { }


