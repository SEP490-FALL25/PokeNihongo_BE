import { Body, Controller, Get, Param, Post, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger'
import { FileInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express'
import { GeminiService } from './gemini.service'
import { EvaluateSpeakingDto, GetPersonalizedRecommendationsDto, AIKaiwaDto, ChatWithGeminiDto, ChatWithGeminiMultipartDto } from './dto/gemini.dto'
import { SpeakingEvaluationResponse, PersonalizedRecommendationsResponse, AIKaiwaResponse, ChatWithGeminiResponse } from './dto/gemini.response.dto'
import { ActiveUser } from '@/common/decorators/active-user.decorator'

@ApiTags('Gemini')
@Controller('gemini')
@ApiBearerAuth()
export class GeminiController {
    constructor(private readonly geminiService: GeminiService) { }

    @Post('speaking/evaluate/:questionBankId')
    @ApiOperation({ summary: 'Đánh giá phát âm SPEAKING cho user' })
    @ApiParam({ name: 'questionBankId', description: 'ID của QuestionBank (loại SPEAKING)' })
    @ApiBody({ type: EvaluateSpeakingDto })
    @ApiResponse({
        status: 200,
        description: 'Đánh giá phát âm thành công',
        type: Object
    })
    async evaluateSpeaking(
        @Param('questionBankId') questionBankId: string,
        @ActiveUser('userId') userId: number,
        @Body() body: EvaluateSpeakingDto
    ): Promise<{ statusCode: number; data: SpeakingEvaluationResponse; message: string }> {
        const result = await this.geminiService.evaluateSpeaking(
            userId,
            Number(questionBankId),
            body
        )

        return {
            statusCode: 200,
            data: result,
            message: 'Đánh giá phát âm thành công'
        }
    }

    @Get('recommendations')
    @ApiOperation({ summary: 'Lấy gợi ý cá nhân hóa dựa trên dữ liệu học tập' })
    @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Số lượng gợi ý (mặc định: 10)' })
    @ApiResponse({
        status: 200,
        description: 'Lấy gợi ý cá nhân hóa thành công',
        type: Object
    })
    async getPersonalizedRecommendations(
        @ActiveUser('userId') userId: number,
        @Query('limit') limit?: string
    ): Promise<{ statusCode: number; data: PersonalizedRecommendationsResponse; message: string }> {
        const limitNumber = limit ? Number(limit) : 10

        if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 50) {
            throw new BadRequestException('Limit phải là số từ 1 đến 50')
        }

        const result = await this.geminiService.getPersonalizedRecommendations(userId, limitNumber)

        return {
            statusCode: 200,
            data: result,
            message: 'Lấy gợi ý cá nhân hóa thành công'
        }
    }

    @Post('kaiwa')
    @UseInterceptors(FileInterceptor('audio'))
    @ApiOperation({
        summary: 'AI Kaiwa - Hội thoại với AI bằng tiếng Nhật với Speech-to-Text và Pronunciation Assessment',
        description: 'Hỗ trợ cả text message và audio file. Nếu có audio, sẽ tự động convert sang text. Có thể đánh giá phát âm nếu có reference text.'
    })
    @ApiBody({ type: AIKaiwaDto })
    @ApiResponse({
        status: 200,
        description: 'Hội thoại AI thành công',
        type: Object
    })
    async aiKaiwa(
        @ActiveUser('userId') userId: number,
        @Body() body: AIKaiwaDto,
        @UploadedFile() audioFile?: Express.Multer.File
    ): Promise<{ statusCode: number; data: AIKaiwaResponse; message: string }> {
        // Nếu có upload audio file, cần upload lên cloud trước và lấy URL
        // Tạm thời giữ nguyên logic hiện tại, user sẽ upload audio lên trước và gửi URL
        // Hoặc có thể thêm logic upload file ở đây nếu cần

        const result = await this.geminiService.aiKaiwa(userId, body)

        return {
            statusCode: 200,
            data: result,
            message: 'Hội thoại AI thành công'
        }
    }


    //chat with gemini
    @Post('chat')
    @UseInterceptors(AnyFilesInterceptor()) // Cần interceptor để parse multipart/form-data
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: 'Chat với Gemini',
        description: 'API chat đơn giản với Gemini AI. Hỗ trợ conversation history và chọn model tùy chỉnh.'
    })
    @ApiBody({ type: ChatWithGeminiMultipartDto })
    @ApiResponse({
        status: 200,
        description: 'Chat với Gemini thành công',
        type: Object
    })
    async chatWithGemini(
        @ActiveUser('userId') userId: number,
        @Body() body: ChatWithGeminiMultipartDto
    ): Promise<{ statusCode: number; data: ChatWithGeminiResponse; message: string }> {
        // Validate và convert multipart form data to DTO format
        if (!body || !body.message) {
            throw new BadRequestException('Message là bắt buộc')
        }

        const chatDto: ChatWithGeminiDto = {
            message: body.message,
            conversationId: body.conversationId,
            modelName: body.modelName as any,
            saveHistory: body.saveHistory === 'true' || body.saveHistory === undefined || body.saveHistory === '',
            useServiceAccount: body.useServiceAccount === 'true'
        }

        const result = await this.geminiService.chatWithGemini(userId, chatDto)

        return {
            statusCode: 200,
            data: result,
            message: 'Chat với Gemini thành công'
        }
    }
}
