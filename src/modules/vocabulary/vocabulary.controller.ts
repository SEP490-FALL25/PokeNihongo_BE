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
    UpdateVocabularyMultipartSwaggerDTO,
    CreateVocabularyAdvancedDTO,
    VocabularyAdvancedResponseDTO
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
import { FileInterceptor, FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express'
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
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'imageUrl', maxCount: 1 },
        { name: 'audioUrl', maxCount: 1 }
    ], CloudinaryMultiMulterConfig))
    @ApiOperation({
        summary: 'Tạo từ vựng mới với upload files',
        description: 'Tạo từ vựng mới. Gửi imageUrl và audioUrl. Nếu không có audio, sẽ tự động tạo bằng Text-to-Speech.'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        type: CreateVocabularyMultipartSwaggerDTO,
        description: 'Form data với wordJp, reading, imageUrl và audioUrl (optional)'
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo từ vựng thành công',
        type: VocabularyResponseSwaggerDTO
    })
    @ZodSerializerDto(VocabularyResDTO)
    create(
        @Body() body: CreateVocabularyMultipartSwaggerDTO,
        @UploadedFiles() files?: { imageUrl?: Express.Multer.File[], audioUrl?: Express.Multer.File[] },
        @ActiveUser('userId') userId?: number
    ) {
        const imageFile = files?.imageUrl?.[0]
        const audioFile = files?.audioUrl?.[0]

        return this.vocabularyService.create(
            {
                wordJp: body.wordJp,
                reading: body.reading
            },
            imageFile,
            audioFile,
            userId
        )
    }

    @Put(':id')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'imageUrl', maxCount: 1 },
        { name: 'audioUrl', maxCount: 1 }
    ], CloudinaryMultiMulterConfig))
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Cập nhật từ vựng với upload files',
        description: 'Cập nhật từ vựng. Gửi imageUrl và audioUrl.'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        type: UpdateVocabularyMultipartSwaggerDTO,
        description: 'Form data với wordJp, reading, imageUrl và audioUrl (optional)'
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật từ vựng thành công',
        type: VocabularyResponseSwaggerDTO
    })
    @ZodSerializerDto(VocabularyResDTO)
    update(
        @Param() params: GetVocabularyByIdParamsDTO,
        @Body() body: UpdateVocabularyMultipartSwaggerDTO,
        @UploadedFiles() files?: { imageUrl?: Express.Multer.File[], audioUrl?: Express.Multer.File[] },
        @ActiveUser('userId') userId?: number
    ) {
        const imageFile = files?.imageUrl?.[0]
        const audioFile = files?.audioUrl?.[0]

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
    @ZodSerializerDto(VocabularyResDTO)
    remove(
        @Param() params: GetVocabularyByIdParamsDTO,
        @ActiveUser('userId') userId: number
    ) {
        return this.vocabularyService.remove(params.id)
    }

    //#region Advanced Vocabulary API

    @Post('advanced')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Tạo từ vựng nâng cao với Meaning, WordType và Kanji',
        description: 'Tạo từ vựng mới với nghĩa đa ngôn ngữ, loại từ và xử lý Kanji thông minh'
    })
    @ApiBody({
        type: CreateVocabularyAdvancedDTO,
        description: 'Dữ liệu từ vựng nâng cao'
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo từ vựng thành công',
        type: VocabularyAdvancedResponseDTO
    })
    @ApiResponse({
        status: 202,
        description: 'Tạo từ vựng thành công nhưng có Kanji chưa được định nghĩa',
        type: VocabularyAdvancedResponseDTO
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu từ vựng không hợp lệ'
    })
    createAdvanced(
        @Body() body: CreateVocabularyAdvancedDTO,
        @ActiveUser('userId') userId?: number
    ) {
        return this.vocabularyService.createAdvanced(body, userId)
    }

    //#endregion
}
