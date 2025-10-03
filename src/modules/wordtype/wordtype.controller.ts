import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    UseGuards
} from '@nestjs/common'
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiBody,
    ApiParam,
    ApiQuery
} from '@nestjs/swagger'
import { WordTypeService } from './wordtype.service'
import {
    CreateWordTypeBodyDTO,
    UpdateWordTypeBodyDTO,
    WordTypeResponseDTO,
    WordTypeListResponseDTO,
    GetWordTypeListQueryDTO,
    GetWordTypeByIdParamsDTO,
    CreateWordTypeSwaggerDTO,
    UpdateWordTypeSwaggerDTO,
    WordTypeSwaggerResponseDTO,
    WordTypeListSwaggerResponseDTO
} from './dto/wordtype.dto'
import { ZodSerializerDto } from 'nestjs-zod'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { AccessTokenGuard } from '@/common/guards/access-token.guard'

@ApiTags('WordType')
@Controller('wordtype')
@UseGuards(AuthenticationGuard, AccessTokenGuard)
@ApiBearerAuth()
export class WordTypeController {
    constructor(private readonly wordTypeService: WordTypeService) { }

    @Get()
    @ApiOperation({
        summary: 'Lấy danh sách loại từ',
        description: 'Lấy danh sách tất cả loại từ với phân trang và tìm kiếm'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách loại từ thành công',
        type: WordTypeListSwaggerResponseDTO
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu truy vấn không hợp lệ'
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập'
    })
    findMany(@Query() query: GetWordTypeListQueryDTO) {
        // Transform query to match service expectations
        const transformedQuery = {
            ...query,
            sortBy: query.sortBy as 'id' | 'createdAt' | 'updatedAt' | 'nameKey' | 'tag' | undefined
        }
        return this.wordTypeService.findMany(transformedQuery)
    }

    @Get('stats')
    @ApiOperation({
        summary: 'Lấy thống kê loại từ',
        description: 'Lấy thống kê tổng quan về loại từ'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy thống kê thành công'
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập'
    })
    getStats() {
        return this.wordTypeService.getStats()
    }

    @Get('tag/:tag')
    @ApiOperation({
        summary: 'Lấy loại từ theo tag',
        description: 'Lấy danh sách loại từ theo tag cụ thể'
    })
    @ApiParam({
        name: 'tag',
        description: 'Tag của loại từ',
        example: 'noun'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy loại từ theo tag thành công',
        type: [WordTypeSwaggerResponseDTO]
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập'
    })
    @ZodSerializerDto(WordTypeResponseDTO)
    findByTag(@Param('tag') tag: string) {
        return this.wordTypeService.findByTag(tag)
    }

    @Get('name-key/:nameKey')
    @ApiOperation({
        summary: 'Lấy loại từ theo name key',
        description: 'Lấy loại từ theo name key cụ thể'
    })
    @ApiParam({
        name: 'nameKey',
        description: 'Name key của loại từ',
        example: 'wordtype.noun.name'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy loại từ thành công',
        type: WordTypeSwaggerResponseDTO
    })
    @ApiResponse({
        status: 404,
        description: 'Loại từ không tồn tại'
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập'
    })
    @ZodSerializerDto(WordTypeResponseDTO)
    findByNameKey(@Param('nameKey') nameKey: string) {
        return this.wordTypeService.findByNameKey(nameKey)
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Lấy loại từ theo ID',
        description: 'Lấy thông tin chi tiết của một loại từ'
    })
    @ApiParam({
        name: 'id',
        description: 'ID của loại từ',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy loại từ thành công',
        type: WordTypeSwaggerResponseDTO
    })
    @ApiResponse({
        status: 404,
        description: 'Loại từ không tồn tại'
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập'
    })
    findById(@Param() params: GetWordTypeByIdParamsDTO) {
        return this.wordTypeService.findById(params.id)
    }

    @Post()
    @ApiOperation({
        summary: 'Tạo loại từ mới',
        description: 'Tạo một loại từ mới trong hệ thống'
    })
    @ApiBody({
        type: CreateWordTypeSwaggerDTO,
        description: 'Dữ liệu loại từ mới'
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo loại từ thành công',
        type: WordTypeSwaggerResponseDTO
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu loại từ không hợp lệ'
    })
    @ApiResponse({
        status: 409,
        description: 'Loại từ với nameKey này đã tồn tại'
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập'
    })
    create(@Body() body: CreateWordTypeBodyDTO) {
        return this.wordTypeService.create(body)
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Cập nhật loại từ',
        description: 'Cập nhật thông tin của một loại từ'
    })
    @ApiParam({
        name: 'id',
        description: 'ID của loại từ',
        example: 1
    })
    @ApiBody({
        type: UpdateWordTypeSwaggerDTO,
        description: 'Dữ liệu cập nhật loại từ'
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật loại từ thành công',
        type: WordTypeSwaggerResponseDTO
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu loại từ không hợp lệ'
    })
    @ApiResponse({
        status: 404,
        description: 'Loại từ không tồn tại'
    })
    @ApiResponse({
        status: 409,
        description: 'Loại từ với nameKey này đã tồn tại'
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập'
    })
    update(
        @Param() params: GetWordTypeByIdParamsDTO,
        @Body() body: UpdateWordTypeBodyDTO
    ) {
        return this.wordTypeService.update(params.id, body)
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Xóa loại từ',
        description: 'Xóa một loại từ khỏi hệ thống'
    })
    @ApiParam({
        name: 'id',
        description: 'ID của loại từ',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa loại từ thành công'
    })
    @ApiResponse({
        status: 404,
        description: 'Loại từ không tồn tại'
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập'
    })
    delete(@Param() params: GetWordTypeByIdParamsDTO) {
        return this.wordTypeService.delete(params.id)
    }

    @Post('seed-defaults')
    @ApiOperation({
        summary: 'Tạo loại từ mặc định',
        description: 'Tạo các loại từ mặc định nếu chưa có'
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo loại từ mặc định thành công'
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập'
    })
    createDefaultWordTypes() {
        return this.wordTypeService.createDefaultWordTypes()
    }
}
