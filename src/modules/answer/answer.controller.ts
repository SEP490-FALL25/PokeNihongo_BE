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
    Res
} from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { ZodSerializerDto } from 'nestjs-zod'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { UseGuards } from '@nestjs/common'
import { AnswerService } from './answer.service'
import {
    CreateAnswerBodyDTO,
    CreateMultipleAnswersBodyDTO,
    UpdateAnswerBodyDTO,
    GetAnswerByIdParamsDTO,
    GetAnswerListQueryDTO,
    AnswerResponseDTO,
    AnswerListResDTO,
    CreateMultipleAnswersResponseDTO,
} from './dto/answer.zod-dto'
import {
    AnswerResponseSwaggerDTO,
    AnswerListResponseSwaggerDTO,
    CreateAnswerSwaggerDTO,
    CreateMultipleAnswersSwaggerDTO,
    CreateMultipleAnswersResponseSwaggerDTO,
    UpdateAnswerSwaggerDTO,
    GetAnswerListQuerySwaggerDTO,
} from './dto/answer.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'

@ApiTags('Answers')
@Controller('answers')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class AnswerController {
    constructor(private readonly answerService: AnswerService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Tạo câu trả lời mới',
        description: 'Tạo câu trả lời mới cho câu hỏi. Hệ thống sẽ kiểm tra loại câu hỏi và áp dụng quy tắc tương ứng.' +
            '\n\nQuy tắc đặc biệt:' +
            '\n• MATCHING type: Chỉ cho phép tạo 1 answer duy nhất' +
            '\n• Các loại khác: Không giới hạn số lượng answer'
    })
    @ApiResponse({ status: 201, description: 'Tạo câu trả lời thành công', type: AnswerResponseSwaggerDTO })
    @ApiBody({ type: CreateAnswerSwaggerDTO })
    @ZodSerializerDto(AnswerResponseDTO)
    async createAnswer(@Body() body: CreateAnswerBodyDTO) {
        return await this.answerService.createAnswer(body)
    }

    @Post('multiple')
    @ApiOperation({
        summary: 'Tạo nhiều câu trả lời cùng lúc',
        description: 'Tạo nhiều câu trả lời cho một câu hỏi cùng lúc. Hệ thống sẽ kiểm tra từng câu trả lời và báo cáo kết quả chi tiết.' +
            '\n\nQuy tắc đặc biệt:' +
            '\n• MATCHING type: Chỉ cho phép tạo 1 answer duy nhất' +
            '\n• Các loại khác: Không giới hạn số lượng answer' +
            '\n• Tối đa 4 câu trả lời mỗi lần tạo' +
            '\n• Hệ thống sẽ báo cáo câu trả lời nào thành công, câu nào thất bại và lý do'
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo câu trả lời thành công',
        type: CreateMultipleAnswersResponseSwaggerDTO
    })
    @ApiResponse({
        status: 207,
        description: 'Tạo một phần câu trả lời thành công (Multi-status)',
        type: CreateMultipleAnswersResponseSwaggerDTO
    })
    @ApiResponse({
        status: 400,
        description: 'Không thể tạo câu trả lời nào',
        type: CreateMultipleAnswersResponseSwaggerDTO
    })
    @ApiBody({ type: CreateMultipleAnswersSwaggerDTO })
    @ZodSerializerDto(CreateMultipleAnswersResponseDTO)
    async createMultipleAnswers(
        @Body() body: CreateMultipleAnswersBodyDTO,
        @Res() res: Response
    ) {
        const result = await this.answerService.createMultiple(body)
        return res.status(result.statusCode).json(result) as any
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách câu trả lời với phân trang và tìm kiếm' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách câu trả lời thành công', type: AnswerListResponseSwaggerDTO })
    @ApiQuery({ type: GetAnswerListQuerySwaggerDTO })
    @ZodSerializerDto(AnswerListResDTO)
    async getAnswerList(@Query() query: GetAnswerListQueryDTO) {
        return await this.answerService.getAnswerList(query)
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy thông tin câu trả lời theo ID' })
    @ApiResponse({ status: 200, description: 'Lấy thông tin câu trả lời thành công', type: AnswerResponseSwaggerDTO })
    @ZodSerializerDto(AnswerResponseDTO)
    async getAnswerById(@Param('id') id: string, @I18nLang() lang: string) {
        return await this.answerService.getAnswerById(Number(id), lang)
    }

    @Put(':id')
    @ApiOperation({ summary: 'Cập nhật câu trả lời' })
    @ApiBody({ type: UpdateAnswerSwaggerDTO })
    @ApiResponse({ status: 200, description: 'Cập nhật câu trả lời thành công', type: AnswerResponseSwaggerDTO })
    @ZodSerializerDto(AnswerResponseDTO)
    async updateAnswer(
        @Param('id') id: string,
        @Body() body: UpdateAnswerBodyDTO
    ) {
        return await this.answerService.updateAnswer(Number(id), body)
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Xóa câu trả lời' })
    @ApiResponse({ status: 204, description: 'Xóa câu trả lời thành công' })
    @ZodSerializerDto(MessageResDTO)
    async deleteAnswer(@Param('id') id: string) {
        return await this.answerService.deleteAnswer(Number(id))
    }
}
