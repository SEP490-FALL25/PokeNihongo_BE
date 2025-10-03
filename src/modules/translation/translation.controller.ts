import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
    CreateTranslationBodyDTO,
    UpdateTranslationBodyDTO,
    GetTranslationByIdParamsDTO,
    GetTranslationListQueryDTO,
    GetTranslationsByKeyQueryDTO,
    GetTranslationsByLanguageQueryDTO,
    TranslationResponseDTO,
    TranslationListResponseDTO,
    TranslationByKeyResponseDTO
} from './dto/translation.dto'
import {
    CreateTranslationSwaggerDTO,
    UpdateTranslationSwaggerDTO,
    TranslationSwaggerResponseDTO,
    TranslationListSwaggerResponseDTO,
    TranslationByKeySwaggerResponseDTO
} from './dto/translation.dto'
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
    Query
} from '@nestjs/common'
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags
} from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { TranslationService } from './translation.service'

@ApiTags('Translation')
@Controller('translation')
export class TranslationController {
    constructor(private readonly translationService: TranslationService) { }

    @Get()
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Lấy danh sách bản dịch',
        description: 'Lấy danh sách bản dịch với phân trang và tìm kiếm'
    })
    @ApiQuery({
        name: 'page',
        required: false,
        description: 'Trang hiện tại',
        example: 1
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Số lượng bản dịch mỗi trang',
        example: 10
    })
    @ApiQuery({
        name: 'search',
        required: false,
        description: 'Tìm kiếm theo key hoặc value'
    })
    @ApiQuery({
        name: 'languageCode',
        required: false,
        description: 'Lọc theo mã ngôn ngữ'
    })
    @ApiQuery({
        name: 'key',
        required: false,
        description: 'Lọc theo key cụ thể'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách bản dịch thành công',
        type: TranslationListSwaggerResponseDTO
    })
    findMany(@Query() query: GetTranslationListQueryDTO) {
        return this.translationService.findMany(query)
    }

    @Get('by-key')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Lấy tất cả bản dịch theo key',
        description: 'Lấy tất cả bản dịch cho một key cụ thể'
    })
    @ApiQuery({
        name: 'key',
        description: 'Key để lấy tất cả bản dịch',
        example: 'lesson.1.title'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy bản dịch theo key thành công',
        type: TranslationByKeySwaggerResponseDTO
    })
    findByKey(@Query() query: GetTranslationsByKeyQueryDTO) {
        return this.translationService.findByKey(query)
    }

    @Get('by-language')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Lấy tất cả bản dịch theo ngôn ngữ',
        description: 'Lấy tất cả bản dịch cho một ngôn ngữ cụ thể'
    })
    @ApiQuery({
        name: 'languageCode',
        description: 'Mã ngôn ngữ để lấy tất cả bản dịch',
        example: 'vi'
    })
    @ApiQuery({
        name: 'page',
        required: false,
        description: 'Trang hiện tại',
        example: 1
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Số lượng bản dịch mỗi trang',
        example: 10
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy bản dịch theo ngôn ngữ thành công',
        type: TranslationListSwaggerResponseDTO
    })
    findByLanguage(@Query() query: GetTranslationsByLanguageQueryDTO) {
        return this.translationService.findByLanguage(query)
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Lấy bản dịch theo ID',
        description: 'Lấy thông tin chi tiết của một bản dịch'
    })
    @ApiParam({
        name: 'id',
        description: 'ID của bản dịch',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy bản dịch thành công',
        type: TranslationSwaggerResponseDTO
    })
    @ApiResponse({
        status: 404,
        description: 'Bản dịch không tồn tại'
    })
    findById(@Param() params: GetTranslationByIdParamsDTO) {
        return this.translationService.findById(params.id)
    }

    @Post()
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Tạo bản dịch mới',
        description: 'Tạo một bản dịch mới trong hệ thống'
    })
    @ApiBody({
        type: CreateTranslationSwaggerDTO,
        description: 'Dữ liệu bản dịch mới'
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo bản dịch thành công',
        type: TranslationSwaggerResponseDTO
    })
    create(@Body() body: CreateTranslationBodyDTO) {
        return this.translationService.create(body)
    }

    @Post('bulk')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Tạo nhiều bản dịch cùng lúc',
        description: 'Tạo nhiều bản dịch cùng lúc trong hệ thống'
    })
    @ApiBody({
        type: [CreateTranslationSwaggerDTO],
        description: 'Danh sách dữ liệu bản dịch mới'
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo nhiều bản dịch thành công',
        schema: {
            type: 'object',
            properties: {
                count: {
                    type: 'number',
                    description: 'Số lượng bản dịch đã tạo'
                }
            }
        }
    })
    createMany(@Body() body: CreateTranslationBodyDTO[]) {
        return this.translationService.createMany(body)
    }

    @Put(':id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Cập nhật bản dịch',
        description: 'Cập nhật thông tin của một bản dịch'
    })
    @ApiParam({
        name: 'id',
        description: 'ID của bản dịch',
        example: 1
    })
    @ApiBody({
        type: UpdateTranslationSwaggerDTO,
        description: 'Dữ liệu cập nhật bản dịch'
    })
    update(
        @Param() params: GetTranslationByIdParamsDTO,
        @Body() body: UpdateTranslationBodyDTO
    ) {
        return this.translationService.update(params.id, body)
    }

    @Delete(':id')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Xóa bản dịch',
        description: 'Xóa một bản dịch khỏi hệ thống'
    })
    @ApiParam({
        name: 'id',
        description: 'ID của bản dịch',
        example: 1
    })
    delete(@Param() params: GetTranslationByIdParamsDTO) {
        return this.translationService.delete(params.id)
    }

    @Delete('by-key/:key')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Xóa tất cả bản dịch theo key',
        description: 'Xóa tất cả bản dịch cho một key cụ thể'
    })
    @ApiParam({
        name: 'key',
        description: 'Key để xóa tất cả bản dịch',
        example: 'lesson.1.title'
    })
    @ApiResponse({
        status: 204,
        description: 'Xóa tất cả bản dịch theo key thành công'
    })
    deleteByKey(@Param('key') key: string) {
        return this.translationService.deleteByKey(key)
    }
}
