import { Body, Controller, Get, Param, Post, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger'
import { FileInterceptor } from '@nestjs/platform-express'
import { GeminiService } from './gemini.service'
import { EvaluateSpeakingDto, GetPersonalizedRecommendationsDto } from './dto/gemini.dto'
import { SpeakingEvaluationResponse, PersonalizedRecommendationsResponse } from './dto/gemini.response.dto'
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
}
