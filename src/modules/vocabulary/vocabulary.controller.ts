import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
    CreateVocabularyBodyDTO,
    GetVocabularyByIdParamsDTO,
    GetVocabularyListQueryDTO,
    UpdateVocabularyBodyDTO,
    VocabularyListResDTO,
    VocabularyResDTO
} from '@/modules/vocabulary/dto/vocabulary.zod-dto'
import { VocabularyNotFoundException } from '@/modules/vocabulary/dto/vocabulary.error'
import {
    VocabularyResponseSwaggerDTO,
    VocabularyListResponseSwaggerDTO,
    GetVocabularyListQuerySwaggerDTO,
    UpdateVocabularyMultipartSwaggerDTO,
} from '@/modules/vocabulary/dto/vocabulary.dto'
import { AddMeaningToVocabularyDTO, AddMeaningSwaggerDTO } from '@/modules/vocabulary/dto/add-meaning.dto'
import {
    CreateVocabularyFullMultipartDTO,
    CreateVocabularyFullMultipartSwaggerDTO,
    CreateVocabularyFullResponseSwaggerDTO,
    CreateVocabularyFullResponseDTO
} from '@/modules/vocabulary/dto/create-vocabulary-full.dto'
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


    @Put('by-word/:wordJp')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'imageUrl', maxCount: 1 },
        { name: 'audioUrl', maxCount: 1 }
    ], CloudinaryMultiMulterConfig))
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Cập nhật từ vựng theo wordJp với upload files',
        description: 'Cập nhật từ vựng bằng wordJp. Nếu không upload audioUrl và regenerateAudio=true → Tự động gen audio mới bằng TTS.'
    })
    @ApiConsumes('multipart/form-data')
    @ApiQuery({
        name: 'regenerateAudio',
        required: false,
        type: Boolean,
        description: 'Set true để tự động gen lại audio bằng TTS (nếu không upload audioUrl)'
    })
    @ApiBody({
        type: UpdateVocabularyMultipartSwaggerDTO,
        description: 'Form data với reading, imageUrl và audioUrl (optional)'
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật từ vựng thành công',
        type: VocabularyResponseSwaggerDTO
    })
    @ZodSerializerDto(VocabularyResDTO)
    async updateByWordJp(
        @Param('wordJp') wordJp: string,
        @Body() body: UpdateVocabularyMultipartSwaggerDTO,
        @UploadedFiles() files?: { imageUrl?: Express.Multer.File[], audioUrl?: Express.Multer.File[] },
        @Query('regenerateAudio') regenerateAudio?: boolean,
        @ActiveUser('userId') userId?: number
    ) {
        const imageFile = files?.imageUrl?.[0]
        const audioFile = files?.audioUrl?.[0]

        // Tìm vocabulary theo wordJp
        const vocabulary = await this.vocabularyService.findByWordJp(wordJp)
        if (!vocabulary) {
            throw VocabularyNotFoundException
        }

        const updateData: any = {}
        if (body.wordJp) updateData.wordJp = body.wordJp
        if (body.reading) updateData.reading = body.reading

        return this.vocabularyService.update(
            vocabulary.data.id,
            updateData,
            imageFile,
            audioFile,
            regenerateAudio
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
    @ApiQuery({ type: GetVocabularyListQuerySwaggerDTO })
    @ZodSerializerDto(VocabularyListResDTO)
    findAll(@Query() query: GetVocabularyListQueryDTO) {
        return this.vocabularyService.findAll(query)
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


    @Post('add-meaning')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Thêm nghĩa mới cho từ vựng đã tồn tại',
        description: 'Thêm một nghĩa mới (meaning) cho từ vựng đã có trong hệ thống'
    })
    @ApiBody({
        type: AddMeaningSwaggerDTO,
        description: 'Dữ liệu nghĩa mới cần thêm'
    })
    @ApiResponse({
        status: 201,
        description: 'Thêm nghĩa mới thành công'
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy từ vựng'
    })
    addMeaning(@Body() body: AddMeaningToVocabularyDTO) {
        const { vocabularyId, ...meaningData } = body
        return this.vocabularyService.addMeaningToExistingVocabulary(vocabularyId, meaningData)
    }

    @Post('full')
    @ApiBearerAuth()
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'audioFile', maxCount: 1 },
            { name: 'imageFile', maxCount: 1 }
        ])
    )
    @ApiOperation({
        summary: 'Tạo từ vựng hoàn chỉnh với translations',
        description: 'Tạo vocabulary với file upload (audio/image optional). Tự động: gen audio nếu không có → upload files → phát hiện Kanji → tạo meaning → tạo translations. Nếu từ đã tồn tại, chỉ thêm nghĩa mới.'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        type: CreateVocabularyFullMultipartSwaggerDTO,
        description: 'Form data với audio/image files'
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo từ vựng thành công',
        type: CreateVocabularyFullResponseSwaggerDTO
    })
    @ZodSerializerDto(CreateVocabularyFullResponseDTO)
    createFull(
        @Body() body: CreateVocabularyFullMultipartDTO,
        @UploadedFiles() files: { audioFile?: Express.Multer.File[], imageFile?: Express.Multer.File[] },
        @ActiveUser('userId') userId?: number
    ) {
        const audioFile = files?.audioFile?.[0]
        const imageFile = files?.imageFile?.[0]

        // Convert multipart data to standard format
        const data = {
            word_jp: body.word_jp,
            reading: body.reading,
            level_n: body.level_n,
            word_type_id: body.word_type_id,
            translations: body.translations as any // Already parsed by Zod transform
        }

        return this.vocabularyService.createFullVocabularyWithFiles(data, audioFile, imageFile, userId)
    }

    //#endregion

    //#region Create Multiple Sample Vocabularies
    @Post('create-sample-vocabularies')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Tạo nhiều từ vựng mẫu với dữ liệu mặc định',
        description: 'Tạo một bộ từ vựng tiếng Nhật cơ bản với nghĩa tiếng Việt và tiếng Anh'
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo từ vựng mẫu thành công',
        type: VocabularyListResponseSwaggerDTO
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu không hợp lệ'
    })
    @ZodSerializerDto(VocabularyListResDTO)
    async createSampleVocabularies(@ActiveUser('userId') userId?: number) {
        return this.vocabularyService.createSampleVocabularies(userId)
    }
    //#endregion
}
