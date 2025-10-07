import { createZodDto } from 'nestjs-zod'
import {
    CreateLessonContentBodyType,
    UpdateLessonContentBodyType,
    GetLessonContentByIdParamsType,
    GetLessonContentListQueryType,
} from '../entities/lesson-content.entities'

// Lesson Content DTOs
export class CreateLessonContentBodyDTO extends createZodDto(CreateLessonContentBodyType) { }
export class UpdateLessonContentBodyDTO extends createZodDto(UpdateLessonContentBodyType) { }
export class GetLessonContentByIdParamsDTO extends createZodDto(GetLessonContentByIdParamsType) { }
export class GetLessonContentListQueryDTO extends createZodDto(GetLessonContentListQueryType) { }
