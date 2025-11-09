import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { UserHistoryService } from './user-history.service'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import {
    GetHistoryListQueryDTO,
    GetAdminHistoryListQueryDTO,
    HistoryListResDTO,
    AdminHistoryListResDTO
} from './dto/user-history.zod-dto'
import {
    GetHistoryListQuerySwaggerDTO,
    GetAdminHistoryListQuerySwaggerDTO,
    HistoryListResponseSwaggerDTO,
    AdminHistoryListResponseSwaggerDTO
} from './dto/user-history.dto'

@ApiTags('User History')
@Controller('user-history')
export class UserHistoryController {
    constructor(private readonly userHistoryService: UserHistoryService) { }

    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy lịch sử làm bài của user (TEST và EXERCISE)' })
    @ApiQuery({ type: GetHistoryListQuerySwaggerDTO })
    @ApiResponse({
        status: 200,
        description: 'Lấy lịch sử thành công',
        type: HistoryListResponseSwaggerDTO
    })
    @ZodSerializerDto(HistoryListResDTO)
    async getHistory(
        @Query() query: GetHistoryListQueryDTO,
        @ActiveUser('userId') userId: number,
        @I18nLang() lang: string
    ) {
        return this.userHistoryService.findHistory(userId, query, lang)
    }

    @Get('admin/all')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Admin: Lấy tất cả lịch sử làm bài của tất cả users (TEST và EXERCISE)',
        description: 'Endpoint dành cho Admin để xem lịch sử làm bài của tất cả users. Có thể filter theo userId, type, status. Response bao gồm thông tin user (id, email).'
    })
    @ApiQuery({ type: GetAdminHistoryListQuerySwaggerDTO })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách lịch sử thành công',
        type: AdminHistoryListResponseSwaggerDTO
    })
    @ZodSerializerDto(AdminHistoryListResDTO)
    async getAllHistory(
        @Query() query: GetAdminHistoryListQueryDTO,
        @I18nLang() lang: string
    ) {
        return this.userHistoryService.findAllHistory(query, lang)
    }
}

