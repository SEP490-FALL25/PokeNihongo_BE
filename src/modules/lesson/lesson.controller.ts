import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Put,
    Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { UseGuards } from '@nestjs/common'
import { LessonService } from './lesson.service'
import {
    CreateLessonBodyDTO,
    UpdateLessonBodyDTO,
    GetLessonByIdParamsDTO,
    GetLessonListQueryDTO,
} from './dto/lesson.zod-dto'
import {
    LessonResponseSwaggerDTO,
    LessonListResponseSwaggerDTO,
    CreateLessonSwaggerDTO,
    UpdateLessonSwaggerDTO,
    GetLessonListQuerySwaggerDTO,
} from './dto/lesson.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import {
    LessonResponseDTO,
    LessonListResponseDTO,
} from './dto/lesson.response.dto'

@ApiTags('Lessons')
@Controller('lessons')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class LessonController {
    constructor(private readonly lessonService: LessonService) { }

    // Lesson CRUD
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Tạo bài học mới' })
    @ApiResponse({ status: 201, description: 'Tạo bài học thành công', type: LessonResponseSwaggerDTO })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 409, description: 'Bài học đã tồn tại' })
    @ZodSerializerDto(LessonResponseDTO)
    @ApiBody({ type: CreateLessonSwaggerDTO })
    async createLesson(
        @Body() body: CreateLessonBodyDTO,
        @ActiveUser('userId') userId: number
    ) {
        return await this.lessonService.createLesson(body, userId)
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách bài học với phân trang và tìm kiếm' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách bài học thành công', type: LessonListResponseSwaggerDTO })
    @ApiQuery({ type: GetLessonListQuerySwaggerDTO })
    @ZodSerializerDto(LessonListResponseDTO)
    async getLessonList(@Query() query: GetLessonListQueryDTO) {
        return await this.lessonService.getLessonList(query)
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy thông tin bài học theo ID' })
    @ApiResponse({ status: 200, description: 'Lấy thông tin bài học thành công', type: LessonResponseSwaggerDTO })
    @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
    @ZodSerializerDto(LessonResponseDTO)
    async getLessonById(@Param() params: GetLessonByIdParamsDTO) {
        return await this.lessonService.getLessonById(params)
    }

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Lấy thông tin bài học theo slug' })
    @ApiResponse({ status: 200, description: 'Lấy thông tin bài học thành công', type: LessonResponseSwaggerDTO })
    @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
    @ZodSerializerDto(LessonResponseDTO)
    async getLessonBySlug(@Param('slug') slug: string) {
        return await this.lessonService.getLessonBySlug(slug)
    }

    @Put(':id')
    @ApiOperation({ summary: 'Cập nhật bài học' })
    @ApiResponse({ status: 200, description: 'Cập nhật bài học thành công', type: LessonResponseSwaggerDTO })
    @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
    @ApiResponse({ status: 409, description: 'Bài học đã tồn tại' })
    @ZodSerializerDto(LessonResponseDTO)
    async updateLesson(
        @Param() params: GetLessonByIdParamsDTO,
        @Body() body: UpdateLessonBodyDTO
    ) {
        return await this.lessonService.updateLesson(params.id, body)
    }

    @Patch(':id/toggle-publish')
    @ApiOperation({ summary: 'Thay đổi trạng thái xuất bản bài học' })
    @ApiResponse({ status: 200, description: 'Thay đổi trạng thái xuất bản thành công', type: LessonResponseSwaggerDTO })
    @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
    @ZodSerializerDto(LessonResponseDTO)
    async togglePublishLesson(@Param() params: GetLessonByIdParamsDTO) {
        return await this.lessonService.togglePublishLesson(params.id)
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Xóa bài học' })
    @ApiResponse({ status: 204, description: 'Xóa bài học thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
    @ZodSerializerDto(MessageResDTO)
    async deleteLesson(@Param() params: GetLessonByIdParamsDTO) {
        return await this.lessonService.deleteLesson(params.id)
    }

}
