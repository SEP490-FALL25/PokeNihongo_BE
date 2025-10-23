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
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { UseGuards } from '@nestjs/common'
import { QuestionService } from './question.service'
import {
    CreateQuestionBodyDTO,
    UpdateQuestionBodyDTO,
    GetQuestionByIdParamsDTO,
    GetQuestionListQueryDTO,
} from './dto/question.zod-dto'
import {
    QuestionResponseSwaggerDTO,
    QuestionListResponseSwaggerDTO,
    CreateQuestionSwaggerDTO,
    UpdateQuestionSwaggerDTO,
    GetQuestionListQuerySwaggerDTO,
} from './dto/question.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import {
    QuestionResponseDTO,
    QuestionListResponseDTO,
} from './dto/question.response.dto'

@ApiTags('Questions')
@Controller('questions')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class QuestionController {
    constructor(private readonly questionService: QuestionService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Tạo câu hỏi mới' })
    @ApiResponse({ status: 201, description: 'Tạo câu hỏi thành công', type: QuestionResponseSwaggerDTO })
    @ApiBody({ type: CreateQuestionSwaggerDTO })
    @ZodSerializerDto(QuestionResponseDTO)
    async createQuestion(@Body() body: CreateQuestionBodyDTO) {
        return await this.questionService.createQuestion(body)
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách câu hỏi với phân trang và tìm kiếm' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách câu hỏi thành công', type: QuestionListResponseSwaggerDTO })
    @ApiQuery({ type: GetQuestionListQuerySwaggerDTO })
    @ZodSerializerDto(QuestionListResponseDTO)
    async getQuestionList(@Query() query: GetQuestionListQueryDTO, @I18nLang() lang: string) {
        return await this.questionService.getQuestionList(query, lang)
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy thông tin câu hỏi theo ID' })
    @ApiResponse({ status: 200, description: 'Lấy thông tin câu hỏi thành công', type: QuestionResponseSwaggerDTO })
    @ZodSerializerDto(QuestionResponseDTO)
    async getQuestionById(@Param() params: GetQuestionByIdParamsDTO) {
        return await this.questionService.getQuestionById(params)
    }

    @Put(':id')
    @ApiOperation({ summary: 'Cập nhật câu hỏi' })
    @ApiBody({ type: UpdateQuestionSwaggerDTO })
    @ApiResponse({ status: 200, description: 'Cập nhật câu hỏi thành công', type: QuestionResponseSwaggerDTO })
    @ZodSerializerDto(QuestionResponseDTO)
    async updateQuestion(
        @Param() params: GetQuestionByIdParamsDTO,
        @Body() body: UpdateQuestionBodyDTO
    ) {
        return await this.questionService.updateQuestion(params.id, body)
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Xóa câu hỏi' })
    @ApiResponse({ status: 204, description: 'Xóa câu hỏi thành công' })
    @ZodSerializerDto(MessageResDTO)
    async deleteQuestion(@Param() params: GetQuestionByIdParamsDTO) {
        return await this.questionService.deleteQuestion(params.id)
    }
}
