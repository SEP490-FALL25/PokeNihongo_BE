import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { UseGuards } from '@nestjs/common'
import { LessonContentService } from './lesson-content.service'
import {
    CreateLessonContentBodyDTO,
    UpdateLessonContentBodyDTO,
    GetLessonContentByIdParamsDTO,
    GetLessonContentListQueryDTO,
} from './dto/lesson-content.zod-dto'
import {
    LessonContentResponseSwaggerDTO,
    LessonContentListResponseSwaggerDTO,
    CreateLessonContentSwaggerDTO,
    UpdateLessonContentSwaggerDTO,
    GetLessonContentListQuerySwaggerDTO,
    UpdateLessonContentOrderSwaggerDTO,
} from './dto/lesson-content.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import {
    LessonContentResponseDTO,
    LessonContentListResponseDTO,
} from './dto/lesson-content.response.dto'
import { CreateMutiLessonContentBodyType, UpdateLessonContentOrder } from './entities/lesson-content.entities'

@ApiTags('Lesson Contents')
@Controller('lesson-contents')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class LessonContentController {
    constructor(private readonly lessonContentService: LessonContentService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Tạo nội dung bài học mới',
        description: `Tạo nội dung bài học mới.
**Quy tắc đặc biệt:**
- **contentType**: Chỉ chấp nhận các giá trị 'VOCABULARY', 'GRAMMAR', 'KANJI'`
    })
    @ApiBody({ type: CreateLessonContentSwaggerDTO })
    @ApiResponse({ status: 201, description: 'Tạo nội dung bài học thành công', type: LessonContentResponseSwaggerDTO })
    async createLessonContent(@Body() body: CreateMutiLessonContentBodyType) {
        return await this.lessonContentService.createLessonContent(body)
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách nội dung bài học' })
    @ApiQuery({ type: GetLessonContentListQuerySwaggerDTO })
    @ApiResponse({ status: 200, description: 'Lấy danh sách nội dung bài học thành công', type: LessonContentListResponseSwaggerDTO })
    @ZodSerializerDto(LessonContentListResponseDTO)
    async getLessonContentList(@Query() query: GetLessonContentListQueryDTO) {
        return await this.lessonContentService.getLessonContentList(query)
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy thông tin nội dung bài học theo ID' })
    @ApiResponse({ status: 200, description: 'Lấy thông tin nội dung bài học thành công', type: LessonContentResponseSwaggerDTO })
    @ApiResponse({ status: 404, description: 'Không tìm thấy nội dung bài học' })
    @ZodSerializerDto(LessonContentResponseDTO)
    async getLessonContentById(@Param('id') id: string) {
        return await this.lessonContentService.getLessonContentById(Number(id))
    }

    @Put('order')
    @ApiOperation({ summary: 'Cập nhật vị trí nội dung bài học' })
    @ApiBody({ type: UpdateLessonContentOrderSwaggerDTO })
    @ApiResponse({ status: 200, description: 'Cập nhật vị trí nội dung bài học thành công', type: LessonContentResponseSwaggerDTO })
    async updateLessonContentOrder(
        @Body() body: UpdateLessonContentOrder
    ) {
        return await this.lessonContentService.updateLessonContentOrder(body);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Cập nhật nội dung bài học' })
    @ApiResponse({ status: 200, description: 'Cập nhật nội dung bài học thành công', type: LessonContentResponseSwaggerDTO })
    @ApiResponse({ status: 404, description: 'Không tìm thấy nội dung bài học' })
    @ZodSerializerDto(LessonContentResponseDTO)
    async updateLessonContent(
        @Param('id') id: string,
        @Body() body: UpdateLessonContentBodyDTO
    ) {
        return await this.lessonContentService.updateLessonContent(Number(id), body)
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Xóa nội dung bài học' })
    @ApiResponse({ status: 204, description: 'Xóa nội dung bài học thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy nội dung bài học' })
    @ZodSerializerDto(MessageResDTO)
    async deleteLessonContent(@Param() params: GetLessonContentByIdParamsDTO) {
        return await this.lessonContentService.deleteLessonContent(params.id)
    }
}
