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
import { AnswerService } from './answer.service'
import {
    CreateAnswerBodyDTO,
    UpdateAnswerBodyDTO,
    GetAnswerByIdParamsDTO,
    GetAnswerListQueryDTO,
} from './dto/answer.zod-dto'
import {
    AnswerResponseSwaggerDTO,
    AnswerListResponseSwaggerDTO,
    CreateAnswerSwaggerDTO,
    UpdateAnswerSwaggerDTO,
    GetAnswerListQuerySwaggerDTO,
} from './dto/answer.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import {
    AnswerResponseDTO,
    AnswerListResponseDTO,
} from './dto/answer.response.dto'

@ApiTags('Answers')
@Controller('answers')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class AnswerController {
    constructor(private readonly answerService: AnswerService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Tạo câu trả lời mới' })
    @ApiResponse({ status: 201, description: 'Tạo câu trả lời thành công', type: AnswerResponseSwaggerDTO })
    @ApiBody({ type: CreateAnswerSwaggerDTO })
    @ZodSerializerDto(AnswerResponseDTO)
    async createAnswer(@Body() body: CreateAnswerBodyDTO) {
        return await this.answerService.createAnswer(body)
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách câu trả lời với phân trang và tìm kiếm' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách câu trả lời thành công', type: AnswerListResponseSwaggerDTO })
    @ApiQuery({ type: GetAnswerListQuerySwaggerDTO })
    @ZodSerializerDto(AnswerListResponseDTO)
    async getAnswerList(@Query() query: GetAnswerListQueryDTO) {
        return await this.answerService.getAnswerList(query)
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy thông tin câu trả lời theo ID' })
    @ApiResponse({ status: 200, description: 'Lấy thông tin câu trả lời thành công', type: AnswerResponseSwaggerDTO })
    @ZodSerializerDto(AnswerResponseDTO)
    async getAnswerById(@Param() params: GetAnswerByIdParamsDTO) {
        return await this.answerService.getAnswerById(params)
    }

    @Put(':id')
    @ApiOperation({ summary: 'Cập nhật câu trả lời' })
    @ApiBody({ type: UpdateAnswerSwaggerDTO })
    @ApiResponse({ status: 200, description: 'Cập nhật câu trả lời thành công', type: AnswerResponseSwaggerDTO })
    @ZodSerializerDto(AnswerResponseDTO)
    async updateAnswer(
        @Param() params: GetAnswerByIdParamsDTO,
        @Body() body: UpdateAnswerBodyDTO
    ) {
        return await this.answerService.updateAnswer(params.id, body)
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Xóa câu trả lời' })
    @ApiResponse({ status: 204, description: 'Xóa câu trả lời thành công' })
    @ZodSerializerDto(MessageResDTO)
    async deleteAnswer(@Param() params: GetAnswerByIdParamsDTO) {
        return await this.answerService.deleteAnswer(params.id)
    }
}
