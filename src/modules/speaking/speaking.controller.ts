import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import {
    CreateUserSpeakingAttemptDTO,
    GetUserSpeakingAttemptByIdParamsDTO,
    GetUserSpeakingAttemptListQueryDTO,
    UpdateUserSpeakingAttemptDTO,
    UserSpeakingAttemptResDTO,
    UserSpeakingAttemptListResDTO,
    EvaluateSpeakingRequestDTO,
    EvaluateSpeakingResponseDTO,
    SpeakingStatisticsResDTO
} from './dto/speaking.zod-dto'
import {
    UserSpeakingAttemptResponseSwaggerDTO,
    UserSpeakingAttemptListResponseSwaggerDTO,
    GetUserSpeakingAttemptListQuerySwaggerDTO,
    CreateUserSpeakingAttemptSwaggerDTO,
    UpdateUserSpeakingAttemptSwaggerDTO,
    EvaluateSpeakingRequestSwaggerDTO,
    EvaluateSpeakingResponseSwaggerDTO,
    SpeakingStatisticsResponseSwaggerDTO
} from './dto/speaking.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { SpeakingService } from './speaking.service'

@ApiTags('Speaking')
@Controller('speaking')
export class SpeakingController {
    constructor(private readonly speakingService: SpeakingService) { }

    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Tạo lần thử phát âm mới' })
    @ApiResponse({
        status: 201,
        description: 'Tạo lần thử phát âm thành công',
        type: UserSpeakingAttemptResponseSwaggerDTO
    })
    @ZodSerializerDto(UserSpeakingAttemptResDTO)
    async createUserSpeakingAttempt(
        @Body() body: CreateUserSpeakingAttemptDTO,
        @ActiveUser('userId') userId: number
    ): Promise<MessageResDTO> {
        return this.speakingService.createUserSpeakingAttempt(body, userId)
    }

    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy danh sách lần thử phát âm với phân trang và tìm kiếm' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách lần thử phát âm thành công',
        type: UserSpeakingAttemptListResponseSwaggerDTO
    })
    @ApiResponse({ type: GetUserSpeakingAttemptListQuerySwaggerDTO })
    @ZodSerializerDto(UserSpeakingAttemptListResDTO)
    async getUserSpeakingAttempts(
        @Query() query: GetUserSpeakingAttemptListQueryDTO,
        @I18nLang() lang: string
    ): Promise<MessageResDTO> {
        return this.speakingService.getUserSpeakingAttempts(query)
    }

    @Get('my-attempts')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy danh sách lần thử phát âm của user hiện tại' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách lần thử phát âm của user thành công',
        type: UserSpeakingAttemptListResponseSwaggerDTO
    })
    @ZodSerializerDto(UserSpeakingAttemptListResDTO)
    async getMySpeakingAttempts(
        @ActiveUser('userId') userId: number
    ): Promise<MessageResDTO> {
        return this.speakingService.getUserSpeakingAttemptsByUserId(userId)
    }

    @Get('statistics')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy thống kê phát âm' })
    @ApiResponse({
        status: 200,
        description: 'Lấy thống kê phát âm thành công',
        type: SpeakingStatisticsResponseSwaggerDTO
    })
    @ZodSerializerDto(SpeakingStatisticsResDTO)
    async getSpeakingStatistics(
        @ActiveUser('userId') userId: number
    ): Promise<MessageResDTO> {
        return this.speakingService.getSpeakingStatistics(userId)
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy thông tin lần thử phát âm theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Lấy thông tin lần thử phát âm thành công',
        type: UserSpeakingAttemptResponseSwaggerDTO
    })
    @ZodSerializerDto(UserSpeakingAttemptResDTO)
    async getUserSpeakingAttemptById(
        @Param() params: GetUserSpeakingAttemptByIdParamsDTO,
        @I18nLang() lang: string
    ): Promise<MessageResDTO> {
        return this.speakingService.getUserSpeakingAttemptById(params.id)
    }

    @Put(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cập nhật lần thử phát âm theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật lần thử phát âm thành công',
        type: UserSpeakingAttemptResponseSwaggerDTO
    })
    @ZodSerializerDto(UserSpeakingAttemptResDTO)
    async updateUserSpeakingAttempt(
        @Param() params: GetUserSpeakingAttemptByIdParamsDTO,
        @Body() body: UpdateUserSpeakingAttemptDTO
    ): Promise<MessageResDTO> {
        return this.speakingService.updateUserSpeakingAttempt(params.id, body)
    }

    @Delete(':id')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa lần thử phát âm theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Xóa lần thử phát âm thành công',
        type: UserSpeakingAttemptResponseSwaggerDTO
    })
    @ZodSerializerDto(UserSpeakingAttemptResDTO)
    async deleteUserSpeakingAttempt(
        @Param() params: GetUserSpeakingAttemptByIdParamsDTO
    ): Promise<MessageResDTO> {
        return this.speakingService.deleteUserSpeakingAttempt(params.id)
    }

    @Post('evaluate')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Đánh giá phát âm bằng Google Speech-to-Text API',
        description: 'Gửi file âm thanh để đánh giá phát âm và lưu kết quả'
    })
    @ApiResponse({
        status: 200,
        description: 'Đánh giá phát âm thành công',
        type: EvaluateSpeakingResponseSwaggerDTO
    })
    @ZodSerializerDto(EvaluateSpeakingResponseDTO)
    async evaluateSpeaking(
        @Body() body: EvaluateSpeakingRequestDTO,
        @ActiveUser('userId') userId: number
    ): Promise<MessageResDTO> {
        return this.speakingService.evaluateSpeaking(body, userId)
    }
}
