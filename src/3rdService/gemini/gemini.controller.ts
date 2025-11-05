import { Body, Controller, Get, Param, Post, Query, UseInterceptors, UploadedFile, BadRequestException, Patch } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger'
import { FileInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express'
import { GeminiService } from './gemini.service'
import { EvaluateSpeakingDto, GetPersonalizedRecommendationsDto, AIKaiwaDto, ChatWithGeminiDto, ChatWithGeminiMultipartDto, RecommendationsMultipartDto, ListSavedRecommendationsQueryDto, UpdateRecommendationStatusDto } from './dto/gemini.dto'
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

    @Post('recommendations')
    @UseInterceptors(AnyFilesInterceptor())
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Lấy gợi ý cá nhân hóa dựa trên dữ liệu học tập' })
    @ApiBody({ type: RecommendationsMultipartDto })
    @ApiResponse({ status: 200, description: 'Lấy gợi ý cá nhân hóa thành công', type: Object })
    async getPersonalizedRecommendations(
        @ActiveUser('userId') userId: number,
        @Body() body: RecommendationsMultipartDto
    ): Promise<{ statusCode: number; data: any; message: string }> {
        const limitNumber = body?.limit ? Number(body.limit) : 10
        if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 50) {
            throw new BadRequestException('Limit phải là số từ 1 đến 50')
        }
        const result = await this.geminiService.getPersonalizedRecommendations(userId, limitNumber)
        const rawItems = (result.recommendations || [])
        const filtered = rawItems.filter((r: any) => Number(r.targetId || r.contentId) > 0)
        if (rawItems.length !== filtered.length) {
            try { console.warn(`[RECOMMEND][UI] filtered out ${rawItems.length - filtered.length} invalid items (contentId<=0)`) } catch { }
        }
        const ui = {
            title: 'Làm lại để cải thiện',
            items: filtered.map((r: any) => ({
                contentType: r.targetType || r.contentType,
                contentId: r.targetId || r.contentId,
                reason: r.reason,
                priority: r.priority
            }))
        }
        return { statusCode: 200, data: ui, message: 'Lấy gợi ý cá nhân hóa thành công' }
    }

    // SRS-only recommendations (Vocabulary/Grammar/Kanji) + tạo SRS
    @Post('recommendations/srs')
    @UseInterceptors(AnyFilesInterceptor())
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Gợi ý ôn tập SRS (Vocabulary/Grammar/Kanji)' })
    @ApiBody({ type: RecommendationsMultipartDto })
    async getSrsRecommendations(
        @ActiveUser('userId') userId: number,
        @Body() body: RecommendationsMultipartDto
    ) {
        const limitNumber = body?.limit ? Number(body.limit) : 10
        if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 50) {
            throw new BadRequestException('Limit phải là số từ 1 đến 50')
        }
        const result = await this.geminiService.getPersonalizedRecommendations(userId, limitNumber, {
            createSrs: true,
            allowedTypes: ['VOCABULARY', 'GRAMMAR', 'KANJI']
        })
        const rawItems = (result.recommendations || [])
        const filtered = rawItems.filter((r: any) => Number(r.targetId || r.contentId) > 0)
        if (rawItems.length !== filtered.length) {
            try { console.warn(`[RECOMMEND][UI] filtered out ${rawItems.length - filtered.length} invalid SRS items`) } catch { }
        }
        const ui = {
            title: 'Ôn lại để ghi nhớ',
            items: filtered.map((r: any) => ({
                contentType: r.targetType || r.contentType,
                contentId: r.targetId || r.contentId,
                questionBankId: r.sourceQuestionBankId || r.questionBankId,
                reason: r.reason,
                priority: r.priority
            }))
        }
        return { statusCode: 200, data: ui, message: 'GET_SUCCESS' }
    }

    // Skill recommendations (Reading/Listening/Speaking) - tạo SRS cho TEST/EXERCISE
    @Post('recommendations/skills')
    @UseInterceptors(AnyFilesInterceptor())
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Gợi ý luyện kỹ năng (Reading/Listening/Speaking) - recommend TEST/EXERCISE đã làm sai' })
    @ApiBody({ type: RecommendationsMultipartDto })
    async getSkillRecommendations(
        @ActiveUser('userId') userId: number,
        @Body() body: RecommendationsMultipartDto
    ) {
        const limitNumber = body?.limit ? Number(body.limit) : 10
        if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 50) {
            throw new BadRequestException('Limit phải là số từ 1 đến 50')
        }
        const result = await this.geminiService.getPersonalizedRecommendations(userId, limitNumber, {
            createSrs: true, // Tạo SRS cho TEST/EXERCISE
            allowedTypes: ['TEST', 'EXERCISE'] // Chỉ recommend TEST/EXERCISE đã làm sai
        })
        const rawItems = (result.recommendations || [])
        const filtered = rawItems.filter((r: any) => Number(r.targetId || r.contentId) > 0)
        if (rawItems.length !== filtered.length) {
            try { console.warn(`[RECOMMEND][UI] filtered out ${rawItems.length - filtered.length} invalid skill items`) } catch { }
        }
        const ui = {
            title: 'Luyện kỹ năng để cải thiện',
            items: filtered.map((r: any) => ({
                contentType: r.targetType || r.contentType,
                contentId: r.targetId || r.contentId,
                reason: r.reason,
                priority: r.priority
            }))
        }
        return { statusCode: 200, data: ui, message: 'GET_SUCCESS' }
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

    // Saved recommendations
    @Get('recommendations/saved')
    @ApiOperation({ summary: 'Danh sách recommendations đã lưu trong DB' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async listSaved(
        @ActiveUser('userId') userId: number,
        @Query() query: ListSavedRecommendationsQueryDto
    ) {
        const limit = query?.limit && Number(query.limit) > 0 ? Number(query.limit) : 50
        const data = await this.geminiService.listSavedRecommendations(userId, query.status, limit)
        return { statusCode: 200, data, message: 'GET_SUCCESS' }
    }

    @Patch('recommendations/:id/status')
    @ApiOperation({ summary: 'Cập nhật trạng thái recommendation' })
    async updateRecStatus(
        @ActiveUser('userId') userId: number,
        @Param('id') id: string,
        @Body() body: UpdateRecommendationStatusDto
    ) {
        const data = await this.geminiService.updateRecommendationStatus(userId, Number(id), body.status)
        return { statusCode: 200, data, message: 'UPDATE_SUCCESS' }
    }
}
