import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
    CreateQuestionBankBodyDTO,
    CreateQuestionBankWithMeaningsBodyDTO,
    UpdateQuestionBankWithMeaningsBodyDTO,
    CreateQuestionBankWithAnswersBodyDTO,
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
    UpdateQuestionBankWithMeaningsSwaggerDTO,
    CreateQuestionBankWithAnswersSwaggerDTO,
    CreateQuestionBankWithAnswersResponseSwaggerDTO,
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

    @Post('with-answers')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Tạo câu hỏi mới với 4 câu trả lời cùng lúc',
        description: `Tạo câu hỏi mới với tối đa 4 câu trả lời cùng lúc. Hệ thống sẽ tự động tạo question bank và các câu trả lời tương ứng.
        
**Quy tắc đặc biệt:**
- **MATCHING type**: Chỉ cho phép tạo 1 answer duy nhất và bắt buộc isCorrect = true
- **Các loại khác**: Tối đa 4 answers, chỉ có 1 answer được phép có isCorrect = true
- **audioUrl**: Optional - chỉ khi questionType là LISTENING và không truyền thì hệ thống sẽ tự động gen text-to-speech từ questionJp
- **SPEAKING**: Bắt buộc phải có pronunciation (cách phát âm romaji)
- **Validation**: Tất cả answers phải là tiếng Nhật hợp lệ

**Loại câu hỏi hỗ trợ:** VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, SPEAKING, MATCHING

**Response:** Trả về thông tin câu hỏi đã tạo, danh sách answers thành công, số lượng tạo thành công/thất bại và chi tiết lỗi nếu có.` })
    @ApiBody({ type: CreateQuestionBankWithAnswersSwaggerDTO })
    @ApiResponse({
        status: 201,
        description: 'Tạo câu hỏi và câu trả lời thành công',
        type: CreateQuestionBankWithAnswersResponseSwaggerDTO
    })
    createWithAnswers(@Body() body: CreateQuestionBankWithAnswersBodyDTO, @ActiveUser('userId') userId: number) {
        return this.questionBankService.createWithAnswers(body, userId)
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
    findOne(@Param('id') id: string) {
        return this.questionBankService.findOne(Number(id))
    }

    @Put(':id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Cập nhật câu hỏi với meanings theo ID',
        description: 'Cập nhật câu hỏi kèm theo nghĩa và translations. Tất cả fields đều optional.'
    })
    @ApiBody({ type: UpdateQuestionBankWithMeaningsSwaggerDTO })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật câu hỏi với meanings thành công',
        type: QuestionBankResponseSwaggerDTO
    })
    updateWithMeanings(
        @Param('id') id: string,
        @Body() body: UpdateQuestionBankWithMeaningsBodyDTO
    ) {
        return this.questionBankService.updateWithMeanings(Number(id), body)
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
    remove(@Param('id') id: string) {
        return this.questionBankService.remove(Number(id))
    }
}

