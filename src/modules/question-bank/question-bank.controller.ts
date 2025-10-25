import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
    CreateQuestionBankBodyDTO,
    CreateQuestionBankWithMeaningsBodyDTO,
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
    CreateQuestionBankWithMeaningsSwaggerDTO,
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
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'

@ApiTags('Question Bank')
@Controller('question-bank')
export class QuestionBankController {
    constructor(private readonly questionBankService: QuestionBankService) { }



    @Post('with-meanings')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Tạo câu hỏi mới với nghĩa và bản dịch',
        description: `Tạo câu hỏi mới với nghĩa và bản dịch. 
        
**Quy tắc đặc biệt:**
- **audioUrl**: Optional - chỉ khi questionType là LISTENING và không truyền thì hệ thống sẽ tự động gen text-to-speech từ questionJp
- **SPEAKING**: Bắt buộc phải có pronunciation (cách phát âm romaji)
- **Các loại khác**: audioUrl và pronunciation là tùy chọn

**Loại câu hỏi hỗ trợ:** VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, SPEAKING, MATCHING` })
    @ApiBody({ type: CreateQuestionBankWithMeaningsSwaggerDTO })
    @ApiResponse({
        status: 201,
        description: 'Tạo câu hỏi với nghĩa thành công',
        type: QuestionBankResponseSwaggerDTO
    })
    @ZodSerializerDto(QuestionBankResDTO)
    createWithMeanings(@Body() body: CreateQuestionBankWithMeaningsBodyDTO, @ActiveUser('userId') userId: number) {
        return this.questionBankService.createWithMeanings(body, userId)
    }

    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy danh sách câu hỏi với phân trang và lọc' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách câu hỏi thành công',
        type: QuestionBankListResponseSwaggerDTO
    })
    @ApiQuery({ type: GetQuestionBankListQuerySwaggerDTO })
    findAll(@Query() query: GetQuestionBankListQueryDTO, @I18nLang() lang: string) {
        return this.questionBankService.findAll(query, lang)
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy thông tin câu hỏi theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Lấy thông tin câu hỏi thành công',
        type: QuestionBankResponseSwaggerDTO
    })
    @ZodSerializerDto(QuestionBankResDTO)
    findOne(@Param() params: GetQuestionBankByIdParamsDTO) {
        return this.questionBankService.findOne(params)
    }

    @Put(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cập nhật câu hỏi theo ID' })
    @ApiBody({ type: UpdateQuestionBankSwaggerDTO })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật câu hỏi thành công',
        type: QuestionBankResponseSwaggerDTO
    })
    @ZodSerializerDto(QuestionBankResDTO)
    update(
        @Param() params: GetQuestionBankByIdParamsDTO,
        @Body() body: UpdateQuestionBankBodyDTO
    ) {
        return this.questionBankService.update(params.id, body)
    }

    @Delete(':id')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa câu hỏi theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Xóa câu hỏi thành công',
        type: QuestionBankResponseSwaggerDTO
    })
    @ZodSerializerDto(QuestionBankResDTO)
    remove(@Param() params: GetQuestionBankByIdParamsDTO) {
        return this.questionBankService.remove(params.id)
    }
}

