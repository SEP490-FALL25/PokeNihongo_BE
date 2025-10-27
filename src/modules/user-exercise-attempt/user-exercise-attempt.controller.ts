import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
    CreateUserExerciseAttemptBodyDTO,
    CreateUserExerciseAttemptParamsDTO,
    GetUserExerciseAttemptByIdParamsDTO,
    GetUserExerciseAttemptListQueryDTO,
    UpdateUserExerciseAttemptBodyDTO,
    UserExerciseAttemptListResDTO,
    UserExerciseAttemptResDTO,
    LatestExerciseAttemptsByLessonResDTO
} from '@/modules/user-exercise-attempt/dto/user-exercise-attempt.zod-dto'
import {
    UserExerciseAttemptResponseSwaggerDTO,
    UserExerciseAttemptListResponseSwaggerDTO,
    GetUserExerciseAttemptListQuerySwaggerDTO,
    CreateUserExerciseAttemptParamsSwaggerDTO,
    UpdateUserExerciseAttemptSwaggerDTO,
    ExerciseCompletionResponseSwaggerDTO,
    LatestExerciseAttemptsByLessonResSwaggerDTO
} from '@/modules/user-exercise-attempt/dto/user-exercise-attempt.dto'
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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { UserExerciseAttemptService } from './user-exercise-attempt.service'

@ApiTags('User Exercise Attempt')
@Controller('user-exercise-attempt')
export class UserExerciseAttemptController {
    constructor(private readonly userExerciseAttemptService: UserExerciseAttemptService) { }

    @Post(':exerciseId')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Tạo lần thử bài tập mới' })
    @ApiResponse({
        status: 201,
        description: 'Tạo lần thử bài tập thành công',
        type: UserExerciseAttemptResponseSwaggerDTO
    })
    @ZodSerializerDto(UserExerciseAttemptResDTO)
    create(
        @Param('exerciseId') exerciseId: string,
        @ActiveUser('userId') userId: number
    ) {
        return this.userExerciseAttemptService.create(userId, parseInt(exerciseId, 10))
    }

    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy danh sách lần thử bài tập với phân trang và lọc' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách lần thử bài tập thành công',
        type: UserExerciseAttemptListResponseSwaggerDTO
    })
    @ApiQuery({ type: GetUserExerciseAttemptListQuerySwaggerDTO })
    @ZodSerializerDto(UserExerciseAttemptListResDTO)
    findAll(@Query() query: GetUserExerciseAttemptListQueryDTO) {
        return this.userExerciseAttemptService.findAll(query)
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy thông tin lần thử bài tập theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Lấy thông tin lần thử bài tập thành công',
        type: UserExerciseAttemptResponseSwaggerDTO
    })
    @ZodSerializerDto(UserExerciseAttemptResDTO)
    findOne(@Param('id') id: string) {
        return this.userExerciseAttemptService.findOne(Number(id))
    }

    @Put(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cập nhật lần thử bài tập theo ID' })
    @ApiBody({ type: UpdateUserExerciseAttemptSwaggerDTO })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật lần thử bài tập thành công',
        type: UserExerciseAttemptResponseSwaggerDTO
    })
    @ZodSerializerDto(UserExerciseAttemptResDTO)
    update(
        @Param('id') id: string,
        @Body() body: UpdateUserExerciseAttemptBodyDTO,
        @ActiveUser('userId') userId: number
    ) {
        return this.userExerciseAttemptService.update(Number(id), body)
    }

    @Delete(':id')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa lần thử bài tập theo ID' })
    @ApiResponse({
        status: 200,
        description: 'Xóa lần thử bài tập thành công',
        type: UserExerciseAttemptResponseSwaggerDTO
    })
    @ZodSerializerDto(UserExerciseAttemptResDTO)
    remove(@Param('id') id: string) {
        return this.userExerciseAttemptService.remove(Number(id))
    }

    @Get(':id/check-completion')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Kiểm tra trạng thái hoàn thành bài tập' })
    @ApiResponse({
        status: 200,
        description: 'Kiểm tra trạng thái hoàn thành thành công',
        type: ExerciseCompletionResponseSwaggerDTO
    })
    checkCompletion(@Param('id') id: string, @ActiveUser('userId') userId: number) {
        return this.userExerciseAttemptService.checkExerciseCompletion(Number(id), userId)
    }

    @Put(':id/abandon')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Đánh dấu bài tập là bỏ dở (khi user thoát ra ngoài)' })
    @ApiResponse({
        status: 200,
        description: 'Đánh dấu bài tập bỏ dở thành công',
        type: UserExerciseAttemptResponseSwaggerDTO
    })
    @ZodSerializerDto(UserExerciseAttemptResDTO)
    abandon(@Param('id') id: string, @ActiveUser('userId') userId: number) {
        return this.userExerciseAttemptService.abandon(Number(id), userId)
    }

    @Get(':id/status')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy trạng thái hiện tại của bài tập' })
    @ApiResponse({
        status: 200,
        description: 'Lấy trạng thái bài tập thành công',
        type: UserExerciseAttemptResponseSwaggerDTO
    })
    @ZodSerializerDto(UserExerciseAttemptResDTO)
    getStatus(@Param('id') id: string, @ActiveUser('userId') userId: number) {
        return this.userExerciseAttemptService.getStatus(Number(id), userId)
    }

    @Get('latest/lesson/:lessonId')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Lấy danh sách exercise gần nhất của người dùng theo lesson',
        description: 'API này trả về exercise attempt gần nhất của user cho mỗi exercise trong lesson. Nếu user có nhiều attempts cho cùng 1 exercise, sẽ lấy cái mới nhất.'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách exercise gần nhất thành công',
        type: LatestExerciseAttemptsByLessonResSwaggerDTO
    })
    @ZodSerializerDto(LatestExerciseAttemptsByLessonResDTO)
    getLatestExerciseAttemptsByLesson(
        @Param('lessonId') lessonId: string,
        @ActiveUser('userId') userId: number
    ) {
        return this.userExerciseAttemptService.getLatestExerciseAttemptsByLesson(userId, Number(lessonId))
    }
}


