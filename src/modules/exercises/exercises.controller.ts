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
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { UseGuards } from '@nestjs/common'
import { ExercisesService } from './exercises.service'
import {
    CreateExercisesBodyDTO,
    UpdateExercisesBodyDTO,
    GetExercisesByIdParamsDTO,
    GetExercisesListQueryDTO,
} from './dto/exercises.zod-dto'
import {
    ExercisesResponseSwaggerDTO,
    ExercisesListResponseSwaggerDTO,
    CreateExercisesSwaggerDTO,
    UpdateExercisesSwaggerDTO,
    GetExercisesListQuerySwaggerDTO,
} from './dto/exercises.dto'
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

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Tạo bài tập mới' })
    @ApiResponse({ status: 201, description: 'Tạo bài tập thành công', type: ExercisesResponseSwaggerDTO })
    @ApiBody({ type: CreateExercisesSwaggerDTO })
    @ZodSerializerDto(ExercisesResponseDTO)
    async createExercises(@Body() body: CreateExercisesBodyDTO) {
        return await this.exercisesService.createExercises(body)
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

    @Put(':id')
    @ApiOperation({ summary: 'Cập nhật bài tập' })
    @ApiBody({ type: UpdateExercisesSwaggerDTO })
    @ApiResponse({ status: 200, description: 'Cập nhật bài tập thành công', type: ExercisesResponseSwaggerDTO })
    @ZodSerializerDto(ExercisesResponseDTO)
    async updateExercises(
        @Param() params: GetExercisesByIdParamsDTO,
        @Body() body: UpdateExercisesBodyDTO
    ) {
        return await this.exercisesService.updateExercises(params.id, body)
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
