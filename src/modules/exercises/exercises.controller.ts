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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiConsumes } from '@nestjs/swagger'
import { UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ZodSerializerDto } from 'nestjs-zod'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { UseGuards } from '@nestjs/common'
import { ExercisesService } from './exercises.service'
import {
    GetExercisesByIdParamsDTO,
    GetExercisesListQueryDTO,
} from './dto/exercises.zod-dto'
import {
    ExercisesResponseSwaggerDTO,
    ExercisesListResponseSwaggerDTO,
    GetExercisesListQuerySwaggerDTO,
} from './dto/exercises.dto'
import {
    CreateExercisesWithMeaningsBodyDTO,
    CreateExercisesWithMeaningsBodyType,
    ExercisesWithMeaningsResponseDTO,
    ExercisesWithMeaningsResDTO,
    CreateExercisesWithMeaningsSwaggerDTO,
    ExercisesWithMeaningsResponseSwaggerDTO
} from './dto/exercises-with-meanings.dto'
import {
    UpdateExercisesWithMeaningsBodyDTO,
    UpdateExercisesWithMeaningsBodyType,
    UpdateExercisesWithMeaningsResponseDTO,
    UpdateExercisesWithMeaningsResDTO,
    UpdateExercisesWithMeaningsSwaggerDTO,
    UpdateExercisesWithMeaningsResponseSwaggerDTO
} from './dto/update-exercises-with-meanings.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import {
    ExercisesResponseDTO,
    ExercisesListResponseDTO,
} from './dto/exercises.response.dto'

@ApiTags('Exercises')
@Controller('exercises')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class ExercisesController {
    constructor(private readonly exercisesService: ExercisesService) { }

    @Post('with-meanings')
    @UseInterceptors(FileInterceptor('audioFile'))
    @ApiOperation({
        summary: 'Tạo bài tập mới cùng với nghĩa và translations',
        description: 'Tạo một bài tập mới cùng với các nghĩa và translations trong nhiều ngôn ngữ trong một lần gọi API. Có thể upload file âm thanh cùng lúc.'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: CreateExercisesWithMeaningsSwaggerDTO })
    @ApiResponse({
        status: 201,
        description: 'Tạo bài tập cùng với nghĩa thành công',
        type: ExercisesWithMeaningsResponseSwaggerDTO
    })
    @ZodSerializerDto(ExercisesWithMeaningsResDTO)
    async createExercisesWithMeanings(
        @Body() body: CreateExercisesWithMeaningsBodyType,
        @UploadedFile() audioFile?: Express.Multer.File
    ) {
        return await this.exercisesService.createExercisesWithMeanings(body, audioFile)
    }


    @Get()
    @ApiOperation({ summary: 'Lấy danh sách bài tập với phân trang và tìm kiếm' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách bài tập thành công', type: ExercisesListResponseSwaggerDTO })
    @ApiQuery({ type: GetExercisesListQuerySwaggerDTO })
    @ZodSerializerDto(ExercisesListResponseDTO)
    async getExercisesList(@Query() query: GetExercisesListQueryDTO) {
        return await this.exercisesService.getExercisesList(query)
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy thông tin bài tập theo ID' })
    @ApiResponse({ status: 200, description: 'Lấy thông tin bài tập thành công', type: ExercisesResponseSwaggerDTO })
    @ZodSerializerDto(ExercisesResponseDTO)
    async getExercisesById(@Param() params: GetExercisesByIdParamsDTO) {
        return await this.exercisesService.getExercisesById(params)
    }

    @Put(':identifier/with-meanings')
    @UseInterceptors(FileInterceptor('audioFile'))
    @ApiOperation({
        summary: 'Cập nhật bài tập cùng với nghĩa và translations',
        description: 'Cập nhật thông tin bài tập cùng với các nghĩa và translations trong nhiều ngôn ngữ trong một lần gọi API. Có thể sử dụng ID (số) hoặc titleJp (tiêu đề tiếng Nhật) để cập nhật. Có thể upload file âm thanh cùng lúc.'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        type: UpdateExercisesWithMeaningsSwaggerDTO,
        description: 'Dữ liệu cập nhật bài tập cùng với danh sách nghĩa và translations'
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật bài tập cùng với nghĩa thành công',
        type: UpdateExercisesWithMeaningsResponseSwaggerDTO
    })
    @ZodSerializerDto(UpdateExercisesWithMeaningsResDTO)
    async updateExercisesWithMeanings(
        @Param('identifier') identifier: string,
        @Body() body: UpdateExercisesWithMeaningsBodyType,
        @UploadedFile() audioFile?: Express.Multer.File
    ) {
        return await this.exercisesService.updateExercisesWithMeanings(identifier, body, audioFile)
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Xóa bài tập' })
    @ApiResponse({ status: 204, description: 'Xóa bài tập thành công' })
    @ZodSerializerDto(MessageResDTO)
    async deleteExercises(@Param() params: GetExercisesByIdParamsDTO) {
        return await this.exercisesService.deleteExercises(params.id)
    }
}
