import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { UserAIConversationService } from './user-ai-conversation.service'
import {
    CreateUserAIConversationBodySchema,
    GetUserAIConversationByIdParamsSchema,
    GetUserAIConversationListQuerySchema,
    UpdateUserAIConversationBodySchema
} from './entities/user-ai-conversation.entities'


@ApiTags('User AI Conversation')
@ApiBearerAuth()
@Controller('user-ai-conversation')
export class UserAIConversationController {
    constructor(private readonly userAIConversationService: UserAIConversationService) { }

    @Post()
    @ApiOperation({ summary: 'Tạo cuộc hội thoại AI mới' })
    async create(
        @Body() body: any,
        @ActiveUser('userId') userId: number
    ) {
        return this.userAIConversationService.create({
            ...body,
            userId
        })
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách cuộc hội thoại AI' })
    async findAll(
        @Query() query: any,
        @ActiveUser('userId') userId: number
    ) {
        return this.userAIConversationService.findAll(query, userId)
    }

    @Get('conversation/:conversationId')
    @ApiOperation({ summary: 'Lấy tất cả messages theo conversationId' })
    async findByConversationId(
        @Param('conversationId') conversationId: string,
        @ActiveUser('userId') userId: number
    ) {
        return this.userAIConversationService.findByConversationId(conversationId, userId)
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy thông tin cuộc hội thoại AI theo ID' })
    async findOne(
        @Param() params: any
    ) {
        return this.userAIConversationService.findOne(params)
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Cập nhật cuộc hội thoại AI' })
    async update(
        @Param() params: any,
        @Body() body: any
    ) {
        return this.userAIConversationService.update(params.id, body)
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Xóa cuộc hội thoại AI' })
    async remove(
        @Param() params: any
    ) {
        return this.userAIConversationService.remove(params.id)
    }

    @Delete('conversation/:conversationId')
    @ApiOperation({ summary: 'Xóa tất cả messages theo conversationId' })
    async removeByConversationId(
        @Param('conversationId') conversationId: string,
        @ActiveUser('userId') userId: number
    ) {
        return this.userAIConversationService.removeByConversationId(conversationId, userId)
    }
}

