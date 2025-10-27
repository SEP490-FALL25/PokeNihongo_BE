import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import {
    CreateTestSetBodyDTO,
    GetTestSetByIdParamsDTO,
    GetTestSetListQueryDTO,
    UpdateTestSetBodyDTO,
    TestSetResDTO,
    TestSetListResDTO,
    CreateTestSetWithMeaningsBodyDTO,
    UpdateTestSetWithMeaningsBodyDTO,
} from './dto/testset.zod-dto'
import {
    TestSetResponseSwaggerDTO,
    TestSetListResponseSwaggerDTO,
    TestSetWithQuestionsResponseSwaggerDTO,
    GetTestSetListQuerySwaggerDTO,
    CreateTestSetSwaggerDTO,
    UpdateTestSetSwaggerDTO,
    CreateTestSetWithMeaningsSwaggerDTO,
    UpdateTestSetWithMeaningsSwaggerDTO
} from './dto/testset.dto'
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
import { TestSetService } from './testset.service'

@ApiTags('TestSet')
@Controller('testset')
export class TestSetController {
    constructor(private readonly testSetService: TestSetService) { }



    @Post('with-meanings')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Tạo bộ đề mới với meanings',
        description: 'Tạo bộ đề với meanings cho name và description thay vì translations array'
    })
    @ApiBody({ type: CreateTestSetWithMeaningsSwaggerDTO })
    @ApiResponse({
        status: 201,
        description: 'Tạo bộ đề với meanings thành công',
        type: TestSetResponseSwaggerDTO
    })
    async createTestSetWithMeanings(
        @Body() body: CreateTestSetWithMeaningsBodyDTO,
        @ActiveUser('userId') userId: number
    ): Promise<MessageResDTO> {
        return this.testSetService.createTestSetWithMeanings(body, userId)
    }


    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy danh sách bộ đề với phân trang và tìm kiếm' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách bộ đề thành công',
        type: TestSetListResponseSwaggerDTO
    })
    @ApiQuery({ type: GetTestSetListQuerySwaggerDTO })
    @ZodSerializerDto(TestSetListResDTO)
    findAll(@Query() query: GetTestSetListQueryDTO, @I18nLang() lang: string) {
        return this.testSetService.findAll(query, lang)
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy thông tin bộ đề theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Lấy thông tin bộ đề thành công',
        type: TestSetWithQuestionsResponseSwaggerDTO
    })
    findOne(@Param('id') id: string, @I18nLang() lang: string) {
        return this.testSetService.findOne(Number(id), lang)
    }

    @Put(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cập nhật bộ đề theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật bộ đề thành công',
        type: TestSetResponseSwaggerDTO
    })
    async updateTestSet(
        @Param('id') id: string,
        @Body() body: UpdateTestSetBodyDTO,
        @ActiveUser('userId') userId: number
    ): Promise<MessageResDTO> {
        return this.testSetService.updateTestSet(Number(id), body, userId)
    }

    @Put(':id/with-meanings')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cập nhật bộ đề với meanings theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật bộ đề với meanings thành công',
        type: TestSetResponseSwaggerDTO
    })
    async updateTestSetWithMeanings(
        @Param('id') id: string,
        @Body() body: UpdateTestSetWithMeaningsBodyDTO,
        @ActiveUser('userId') userId: number
    ): Promise<MessageResDTO> {
        return this.testSetService.updateTestSetWithMeanings(Number(id), body, userId)
    }

    @Delete(':id')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa bộ đề theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Xóa bộ đề thành công',
        type: TestSetResponseSwaggerDTO
    })
    async deleteTestSet(
        @Param('id') id: string,
        @ActiveUser('userId') userId: number
    ): Promise<MessageResDTO> {
        return this.testSetService.deleteTestSet(Number(id), userId)
    }

}
