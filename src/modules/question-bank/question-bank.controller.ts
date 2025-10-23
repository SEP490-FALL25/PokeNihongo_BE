import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
    CreateQuestionBankBodyDTO,
    GetQuestionBankByIdParamsDTO,
    GetQuestionBankListQueryDTO,
    UpdateQuestionBankBodyDTO,
    QuestionBankListResDTO,
    QuestionBankResDTO
} from '@/modules/question-bank/dto/question-bank.zod-dto'
import {
    QuestionBankResponseSwaggerDTO,
    QuestionBankListResponseSwaggerDTO,
    GetQuestionBankListQuerySwaggerDTO,
    CreateQuestionBankSwaggerDTO,
    UpdateQuestionBankSwaggerDTO
} from '@/modules/question-bank/dto/question-bank.dto'
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
    Query
} from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { QuestionBankService } from './question-bank.service'

@ApiTags('Question Bank')
@Controller('question-bank')
export class QuestionBankController {
    constructor(private readonly questionBankService: QuestionBankService) { }

    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Tạo ngân hàng câu hỏi mới' })
    @ApiBody({ type: CreateQuestionBankSwaggerDTO })
    @ApiResponse({
        status: 201,
        description: 'Tạo ngân hàng câu hỏi thành công',
        type: QuestionBankResponseSwaggerDTO
    })
    @ZodSerializerDto(QuestionBankResDTO)
    create(@Body() body: CreateQuestionBankBodyDTO, @ActiveUser('userId') userId?: number) {
        return this.questionBankService.create(body, userId)
    }

    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy danh sách ngân hàng câu hỏi với phân trang và lọc' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách ngân hàng câu hỏi thành công',
        type: QuestionBankListResponseSwaggerDTO
    })
    @ApiQuery({ type: GetQuestionBankListQuerySwaggerDTO })
    @ZodSerializerDto(QuestionBankListResDTO)
    findAll(@Query() query: GetQuestionBankListQueryDTO) {
        return this.questionBankService.findAll(query)
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy thông tin ngân hàng câu hỏi theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Lấy thông tin ngân hàng câu hỏi thành công',
        type: QuestionBankResponseSwaggerDTO
    })
    @ZodSerializerDto(QuestionBankResDTO)
    findOne(@Param() params: GetQuestionBankByIdParamsDTO) {
        return this.questionBankService.findOne(params)
    }

    @Put(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cập nhật ngân hàng câu hỏi theo ID' })
    @ApiBody({ type: UpdateQuestionBankSwaggerDTO })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật ngân hàng câu hỏi thành công',
        type: QuestionBankResponseSwaggerDTO
    })
    @ZodSerializerDto(QuestionBankResDTO)
    update(
        @Param() params: GetQuestionBankByIdParamsDTO,
        @Body() body: UpdateQuestionBankBodyDTO,
        @ActiveUser('userId') userId?: number
    ) {
        return this.questionBankService.update(params.id, body)
    }

    @Delete(':id')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa ngân hàng câu hỏi theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Xóa ngân hàng câu hỏi thành công',
        type: QuestionBankResponseSwaggerDTO
    })
    @ZodSerializerDto(QuestionBankResDTO)
    remove(@Param() params: GetQuestionBankByIdParamsDTO, @ActiveUser('userId') userId?: number) {
        return this.questionBankService.remove(params.id)
    }
}

