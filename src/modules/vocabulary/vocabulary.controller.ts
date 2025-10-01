import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
    CreateVocabularyBodyDTO,
    GetVocabularyByIdParamsDTO,
    GetVocabularyListQueryDTO,
    UpdateVocabularyBodyDTO,
    VocabularyListResDTO,
    VocabularyResDTO
} from '@/modules/vocabulary/dto/vocabulary.zod-dto'
import {
    VocabularyResponseSwaggerDTO,
    VocabularyListResponseSwaggerDTO,
    GetVocabularyListQuerySwaggerDTO,
    CreateVocabularyMultipartSwaggerDTO,
    UpdateVocabularyMultipartSwaggerDTO
} from '@/modules/vocabulary/dto/vocabulary.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { VOCABULARY_MESSAGE } from '@/common/constants/message'
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
    UploadedFile,
    UploadedFiles,
    UseInterceptors
} from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiConsumes } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { CloudinaryMultiMulterConfig } from '@/3rdService/upload/cloudinary/multer.config'
import { VocabularyService } from './vocabulary.service'

@ApiTags('Vocabulary')
@Controller('vocabulary')
export class VocabularyController {
    constructor(private readonly vocabularyService: VocabularyService) { }


    @Post()
    @ApiBearerAuth()
    @UseInterceptors(FilesInterceptor('files', 2, CloudinaryMultiMulterConfig))
    @ApiOperation({ summary: 'Tạo từ vựng mới với upload files (hình ảnh và âm thanh)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: CreateVocabularyMultipartSwaggerDTO })
    @ApiResponse({
        status: 201,
        description: 'Tạo từ vựng thành công',
        type: VocabularyResponseSwaggerDTO
    })
    @ZodSerializerDto(VocabularyResDTO)
    create(
        @Body() body: CreateVocabularyMultipartSwaggerDTO,
        @UploadedFiles() files?: Express.Multer.File[],
        @ActiveUser('userId') userId?: number
    ) {
        const imageFile = files?.find(file => file.fieldname === 'imageUrl')
        const audioFile = files?.find(file => file.fieldname === 'audioUrl')

        return this.vocabularyService.create(
            {
                wordJp: body.wordJp,
                reading: body.reading
            },
            imageFile,
            audioFile
        )
    }

    @Put(':id')
    @UseInterceptors(FilesInterceptor('files', 2, CloudinaryMultiMulterConfig))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cập nhật từ vựng với upload files (hình ảnh và âm thanh)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: UpdateVocabularyMultipartSwaggerDTO })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật từ vựng thành công',
        type: VocabularyResponseSwaggerDTO
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu từ vựng không hợp lệ'
    })
    @ZodSerializerDto(VocabularyResDTO)
    update(
        @Param() params: GetVocabularyByIdParamsDTO,
        @Body() body: UpdateVocabularyMultipartSwaggerDTO,
        @UploadedFiles() files?: Express.Multer.File[],
        @ActiveUser('userId') userId?: number
    ) {
        const imageFile = files?.find(file => file.fieldname === 'imageUrl')
        const audioFile = files?.find(file => file.fieldname === 'audioUrl')

        const updateData: any = {}
        if (body.wordJp) updateData.wordJp = body.wordJp
        if (body.reading) updateData.reading = body.reading

        return this.vocabularyService.update(
            params.id,
            updateData,
            imageFile,
            audioFile
        )
    }


    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy danh sách từ vựng với phân trang và tìm kiếm' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách từ vựng thành công',
        type: VocabularyListResponseSwaggerDTO
    })
    @ZodSerializerDto(VocabularyListResDTO)
    findAll(@Query() query: GetVocabularyListQueryDTO) {
        return this.vocabularyService.findAll(query)
    }

    @Get('search/:word')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Tìm kiếm từ vựng theo từ khóa' })
    @ApiResponse({
        status: 200,
        description: 'Tìm kiếm từ vựng thành công',
        type: VocabularyListResponseSwaggerDTO
    })
    @ZodSerializerDto(VocabularyListResDTO)
    searchByWord(@Param('word') word: string) {
        return this.vocabularyService.searchByWord(word)
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy thông tin từ vựng theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Lấy thông tin từ vựng thành công',
        type: VocabularyResponseSwaggerDTO
    })
    @ZodSerializerDto(VocabularyResDTO)
    findOne(@Param() params: GetVocabularyByIdParamsDTO) {
        return this.vocabularyService.findOne(params)
    }

    @Delete(':id')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa từ vựng theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Xóa từ vựng thành công',
        type: VocabularyResponseSwaggerDTO
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy từ vựng'
    })
    @ZodSerializerDto(VocabularyResDTO)
    remove(
        @Param() params: GetVocabularyByIdParamsDTO,
        @ActiveUser('userId') userId: number
    ) {
        return this.vocabularyService.remove(params.id)
    }
}
