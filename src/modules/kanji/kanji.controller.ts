import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
    CreateKanjiBodyDTO,
    UpdateKanjiBodyDTO,
    GetKanjiByIdParamsDTO,
    GetKanjiListQueryDTO,
    KanjiResponseDTO,
    KanjiListResponseDTO,
    KanjiResDTO,
    KanjiListResDTO
} from './dto/kanji.dto'
import {
    CreateKanjiSwaggerDTO,
    UpdateKanjiSwaggerDTO,
    KanjiSwaggerResponseDTO,
    KanjiListSwaggerResponseDTO
} from './dto/kanji.dto'
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
import { KanjiService } from './kanji.service'

@ApiTags('Kanji')
@Controller('kanji')
@ApiBearerAuth()
export class KanjiController {
    constructor(private readonly kanjiService: KanjiService) { }

    @Get()
    @ApiOperation({
        summary: 'Lấy danh sách Kanji',
        description: 'Lấy danh sách tất cả Kanji với phân trang và tìm kiếm'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách Kanji thành công',
        type: KanjiListSwaggerResponseDTO
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu truy vấn không hợp lệ'
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập'
    })
    @ZodSerializerDto(KanjiListResDTO)
    findMany(@Query() query: GetKanjiListQueryDTO) {
        // Transform query to match service expectations
        const transformedQuery = {
            ...query,
            sortBy: query.sortBy as 'id' | 'character' | 'meaningKey' | 'strokeCount' | 'jlptLevel' | 'createdAt' | 'updatedAt' | undefined
        }
        return this.kanjiService.findMany(transformedQuery)
    }

    @Get('stats')
    @ApiOperation({
        summary: 'Lấy thống kê Kanji',
        description: 'Lấy thống kê tổng quan về Kanji'
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
        return this.kanjiService.getStats()
    }

    @Get('character/:character')
    @ApiOperation({
        summary: 'Lấy Kanji theo ký tự',
        description: 'Lấy thông tin Kanji theo ký tự cụ thể'
    })
    @ApiParam({
        name: 'character',
        description: 'Ký tự Kanji',
        example: '日'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy Kanji thành công',
        type: KanjiSwaggerResponseDTO
    })
    @ApiResponse({
        status: 404,
        description: 'Kanji không tồn tại'
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập'
    })
    @ZodSerializerDto(KanjiResDTO)
    findByCharacter(@Param('character') character: string) {
        return this.kanjiService.findByCharacter(character)
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Lấy Kanji theo ID',
        description: 'Lấy thông tin chi tiết của một Kanji'
    })
    @ApiParam({
        name: 'id',
        description: 'ID của Kanji',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy Kanji thành công',
        type: KanjiSwaggerResponseDTO
    })
    @ApiResponse({
        status: 404,
        description: 'Kanji không tồn tại'
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập'
    })
    @ZodSerializerDto(KanjiResDTO)
    findById(@Param() params: GetKanjiByIdParamsDTO) {
        return this.kanjiService.findById(params.id)
    }

    @Post()
    @ApiOperation({
        summary: 'Tạo Kanji mới',
        description: 'Tạo một Kanji mới trong hệ thống'
    })
    @ApiBody({
        type: CreateKanjiSwaggerDTO,
        description: 'Dữ liệu Kanji mới'
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo Kanji thành công',
        type: KanjiSwaggerResponseDTO
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu Kanji không hợp lệ'
    })
    @ApiResponse({
        status: 409,
        description: 'Kanji với ký tự này đã tồn tại'
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập'
    })
    @ZodSerializerDto(KanjiResDTO)
    create(@Body() body: CreateKanjiBodyDTO) {
        return this.kanjiService.create(body)
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Cập nhật Kanji',
        description: 'Cập nhật thông tin của một Kanji'
    })
    @ApiParam({
        name: 'id',
        description: 'ID của Kanji',
        example: 1
    })
    @ApiBody({
        type: UpdateKanjiSwaggerDTO,
        description: 'Dữ liệu cập nhật Kanji'
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật Kanji thành công',
        type: KanjiSwaggerResponseDTO
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu Kanji không hợp lệ'
    })
    @ApiResponse({
        status: 404,
        description: 'Kanji không tồn tại'
    })
    @ApiResponse({
        status: 409,
        description: 'Kanji với ký tự này đã tồn tại'
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập'
    })
    @ZodSerializerDto(KanjiResDTO)
    update(
        @Param() params: GetKanjiByIdParamsDTO,
        @Body() body: UpdateKanjiBodyDTO
    ) {
        return this.kanjiService.update(params.id, body)
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Xóa Kanji',
        description: 'Xóa một Kanji khỏi hệ thống'
    })
    @ApiParam({
        name: 'id',
        description: 'ID của Kanji',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa Kanji thành công'
    })
    @ApiResponse({
        status: 404,
        description: 'Kanji không tồn tại'
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập'
    })
    @HttpCode(HttpStatus.OK)
    delete(@Param() params: GetKanjiByIdParamsDTO) {
        return this.kanjiService.delete(params.id)
    }
}