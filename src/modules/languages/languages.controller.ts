import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
    CreateLanguagesBodyDTO,
    UpdateLanguagesBodyDTO,
    GetLanguagesByIdParamsDTO,
    GetLanguagesListQueryDTO,
    GetLanguagesByCodeParamsDTO,
    LanguagesResponseDTO,
    LanguagesListResponseDTO,
    LanguagesResDTO,
    LanguagesListResDTO,
    CreateLanguagesSwaggerDTO,
    UpdateLanguagesSwaggerDTO,
    LanguagesSwaggerResponseDTO,
    LanguagesListSwaggerResponseDTO
} from './dto/languages.dto'
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
import { LanguagesService } from './languages.service'

@ApiTags('Languages')
@Controller('languages')
export class LanguagesController {
    constructor(private readonly languagesService: LanguagesService) { }

    @Get()
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Lấy danh sách ngôn ngữ',
        description: 'Lấy danh sách các ngôn ngữ được hỗ trợ với phân trang và tìm kiếm'
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
        description: 'Số lượng ngôn ngữ mỗi trang',
        example: 10
    })
    @ApiQuery({
        name: 'search',
        required: false,
        description: 'Tìm kiếm theo tên ngôn ngữ'
    })
    @ApiQuery({
        name: 'code',
        required: false,
        description: 'Lọc theo mã ngôn ngữ'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách ngôn ngữ thành công',
        type: LanguagesListSwaggerResponseDTO
    })
    @ZodSerializerDto(LanguagesListResDTO)
    findMany(@Query() query: GetLanguagesListQueryDTO) {
        return this.languagesService.findMany(query)
    }

    @Get('all')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Lấy tất cả ngôn ngữ được hỗ trợ',
        description: 'Lấy danh sách tất cả ngôn ngữ được hỗ trợ trong hệ thống'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy tất cả ngôn ngữ thành công',
        type: [LanguagesSwaggerResponseDTO]
    })
    @ZodSerializerDto(LanguagesListResDTO)
    getAllSupportedLanguages() {
        return this.languagesService.getAllSupportedLanguages()
    }

    @Get('check/:code')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Kiểm tra ngôn ngữ có được hỗ trợ',
        description: 'Kiểm tra xem một ngôn ngữ có được hỗ trợ trong hệ thống không'
    })
    @ApiParam({
        name: 'code',
        description: 'Mã ngôn ngữ cần kiểm tra',
        example: 'vi'
    })
    @ApiResponse({
        status: 200,
        description: 'Kiểm tra ngôn ngữ thành công',
        schema: {
            type: 'object',
            properties: {
                supported: {
                    type: 'boolean',
                    description: 'Ngôn ngữ có được hỗ trợ không'
                }
            }
        }
    })
    async checkLanguageSupport(@Param() params: GetLanguagesByCodeParamsDTO) {
        const supported = await this.languagesService.isLanguageSupported(params.code)
        return { supported }
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Lấy ngôn ngữ theo ID',
        description: 'Lấy thông tin chi tiết của một ngôn ngữ'
    })
    @ApiParam({
        name: 'id',
        description: 'ID của ngôn ngữ',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy ngôn ngữ thành công',
        type: LanguagesSwaggerResponseDTO
    })
    @ApiResponse({
        status: 404,
        description: 'Ngôn ngữ không tồn tại'
    })
    @ZodSerializerDto(LanguagesResDTO)
    findById(@Param() params: GetLanguagesByIdParamsDTO) {
        return this.languagesService.findById(params.id)
    }

    @Get('by-code/:code')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Lấy ngôn ngữ theo mã',
        description: 'Lấy thông tin chi tiết của một ngôn ngữ theo mã'
    })
    @ApiParam({
        name: 'code',
        description: 'Mã ngôn ngữ',
        example: 'vi'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy ngôn ngữ thành công',
        type: LanguagesSwaggerResponseDTO
    })
    @ApiResponse({
        status: 404,
        description: 'Ngôn ngữ không tồn tại'
    })
    @ZodSerializerDto(LanguagesResDTO)
    findByCode(@Param() params: GetLanguagesByCodeParamsDTO) {
        return this.languagesService.findByCode(params)
    }

    @Post()
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Tạo ngôn ngữ mới',
        description: 'Thêm một ngôn ngữ mới vào hệ thống'
    })
    @ApiBody({
        type: CreateLanguagesSwaggerDTO,
        description: 'Dữ liệu ngôn ngữ mới'
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo ngôn ngữ thành công',
        type: LanguagesSwaggerResponseDTO
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu ngôn ngữ không hợp lệ'
    })
    @ApiResponse({
        status: 409,
        description: 'Ngôn ngữ với mã này đã tồn tại'
    })
    @ZodSerializerDto(LanguagesResDTO)
    create(@Body() body: CreateLanguagesBodyDTO) {
        return this.languagesService.create(body)
    }

    @Put(':id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Cập nhật ngôn ngữ',
        description: 'Cập nhật thông tin của một ngôn ngữ'
    })
    @ApiParam({
        name: 'id',
        description: 'ID của ngôn ngữ',
        example: 1
    })
    @ApiBody({
        type: UpdateLanguagesSwaggerDTO,
        description: 'Dữ liệu cập nhật ngôn ngữ'
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật ngôn ngữ thành công',
        type: LanguagesSwaggerResponseDTO
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu ngôn ngữ không hợp lệ'
    })
    @ApiResponse({
        status: 404,
        description: 'Ngôn ngữ không tồn tại'
    })
    @ApiResponse({
        status: 409,
        description: 'Mã ngôn ngữ đã tồn tại'
    })
    @ZodSerializerDto(LanguagesResDTO)
    update(
        @Param() params: GetLanguagesByIdParamsDTO,
        @Body() body: UpdateLanguagesBodyDTO
    ) {
        return this.languagesService.update(params.id, body)
    }

    @Put('by-code/:code')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Cập nhật ngôn ngữ theo mã',
        description: 'Cập nhật thông tin của một ngôn ngữ theo mã'
    })
    @ApiParam({
        name: 'code',
        description: 'Mã ngôn ngữ',
        example: 'vi'
    })
    @ApiBody({
        type: UpdateLanguagesSwaggerDTO,
        description: 'Dữ liệu cập nhật ngôn ngữ'
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật ngôn ngữ thành công',
        type: LanguagesSwaggerResponseDTO
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu ngôn ngữ không hợp lệ'
    })
    @ApiResponse({
        status: 404,
        description: 'Ngôn ngữ không tồn tại'
    })
    @ApiResponse({
        status: 409,
        description: 'Mã ngôn ngữ đã tồn tại'
    })
    @ZodSerializerDto(LanguagesResDTO)
    updateByCode(
        @Param() params: GetLanguagesByCodeParamsDTO,
        @Body() body: UpdateLanguagesBodyDTO
    ) {
        return this.languagesService.updateByCode(params.code, body)
    }

    @Delete(':id')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Xóa ngôn ngữ',
        description: 'Xóa một ngôn ngữ khỏi hệ thống'
    })
    @ApiParam({
        name: 'id',
        description: 'ID của ngôn ngữ',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa ngôn ngữ thành công'
    })
    @ApiResponse({
        status: 404,
        description: 'Ngôn ngữ không tồn tại'
    })
    delete(@Param() params: GetLanguagesByIdParamsDTO) {
        return this.languagesService.delete(params.id)
    }

    @Delete('by-code/:code')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Xóa ngôn ngữ theo mã',
        description: 'Xóa một ngôn ngữ khỏi hệ thống theo mã'
    })
    @ApiParam({
        name: 'code',
        description: 'Mã ngôn ngữ',
        example: 'vi'
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa ngôn ngữ thành công'
    })
    @ApiResponse({
        status: 404,
        description: 'Ngôn ngữ không tồn tại'
    })
    deleteByCode(@Param() params: GetLanguagesByCodeParamsDTO) {
        return this.languagesService.deleteByCode(params.code)
    }
}
