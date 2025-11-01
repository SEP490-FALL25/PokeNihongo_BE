import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { ActiveRolePermissions } from '@/common/decorators/active-role-permissions.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { RoleName } from '@/common/constants/role.constant'
import {
    CreateTestBodyDTO,
    GetTestByIdParamsDTO,
    GetTestListQueryDTO,
    UpdateTestBodyDTO,
    TestResDTO,
    TestListResDTO,
    CreateTestWithMeaningsBodyDTO,
    UpdateTestWithMeaningsBodyDTO,
    DeleteManyTestsBodyDTO,
} from './dto/test.zod-dto'
import {
    TestResponseSwaggerDTO,
    TestListResponseSwaggerDTO,
    GetTestListQuerySwaggerDTO,
    CreateTestSwaggerDTO,
    UpdateTestSwaggerDTO,
    CreateTestWithMeaningsSwaggerDTO,
    UpdateTestWithMeaningsSwaggerDTO,
    DeleteManyTestsSwaggerDTO
} from './dto/test.dto'
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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { TestService } from './test.service'

@ApiTags('Test')
@Controller('test')
export class TestController {
    constructor(private readonly testService: TestService) { }

    @Post('with-meanings')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Tạo bài test mới với meanings',
        description: 'Tạo bài test với meanings cho name và description thay vì translations array'
    })
    @ApiBody({ type: CreateTestWithMeaningsSwaggerDTO })
    @ApiResponse({
        status: 201,
        description: 'Tạo bài test với meanings thành công',
        type: TestResponseSwaggerDTO
    })
    async createTestWithMeanings(
        @Body() body: CreateTestWithMeaningsBodyDTO,
        @ActiveUser('userId') userId: number
    ): Promise<MessageResDTO> {
        return this.testService.createTestWithMeanings(body, userId)
    }

    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy danh sách bài test với phân trang và tìm kiếm' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách bài test thành công',
        type: TestListResponseSwaggerDTO
    })
    @ApiQuery({ type: GetTestListQuerySwaggerDTO })
    @ZodSerializerDto(TestListResDTO)
    findAll(
        @Query() query: GetTestListQueryDTO,
        @I18nLang() lang: string,
        @ActiveRolePermissions('name') roleName: string
    ) {
        // Nếu là admin thì lấy tất cả translations (không filter theo language)
        const isAdmin = roleName === RoleName.Admin
        return this.testService.findAll(query, isAdmin ? undefined : lang)
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy thông tin bài test theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Lấy thông tin bài test thành công',
        type: TestResponseSwaggerDTO
    })
    findOne(@Param('id') id: string, @I18nLang() lang: string) {
        return this.testService.findOne(Number(id), lang)
    }

    @Put(':id/with-meanings')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cập nhật bài test với meanings theo ID' })
    @ApiBody({ type: UpdateTestWithMeaningsSwaggerDTO })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật bài test với meanings thành công',
        type: TestResponseSwaggerDTO
    })
    async updateTestWithMeanings(
        @Param('id') id: string,
        @Body() body: UpdateTestWithMeaningsBodyDTO,
        @ActiveUser('userId') userId: number
    ): Promise<MessageResDTO> {
        return this.testService.updateTestWithMeanings(Number(id), body, userId)
    }

    @Delete('bulk')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa nhiều bài test cùng lúc' })
    @ApiBody({ type: DeleteManyTestsSwaggerDTO })
    @ApiResponse({
        status: 200,
        description: 'Xóa nhiều bài test thành công',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: { type: 'string', example: 'Xóa thành công 3/3 bài test' },
                data: {
                    type: 'object',
                    properties: {
                        deletedCount: { type: 'number', example: 3 },
                        deletedIds: { type: 'array', items: { type: 'number' }, example: [1, 2, 3] },
                        requestedCount: { type: 'number', example: 3 },
                        notFoundCount: { type: 'number', example: 0 }
                    }
                }
            }
        }
    })
    async deleteManyTests(
        @Body() body: DeleteManyTestsBodyDTO,
        @ActiveUser('userId') userId: number
    ): Promise<MessageResDTO> {
        return this.testService.deleteManyTests(body, userId)
    }

    @Delete(':id')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa bài test theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Xóa bài test thành công',
        type: TestResponseSwaggerDTO
    })
    async deleteTest(
        @Param('id') id: string,
        @ActiveUser('userId') userId: number
    ): Promise<MessageResDTO> {
        return this.testService.deleteTest(Number(id), userId)
    }
}

