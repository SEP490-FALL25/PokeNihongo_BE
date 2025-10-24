import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
    CreateTestSetQuestionBankBodyDTO,
    UpdateTestSetQuestionBankBodyDTO,
    GetTestSetQuestionBankByIdParamsDTO,
    GetTestSetQuestionBankByTestSetIdParamsDTO,
    UpdateQuestionOrderDTO,
    TestSetQuestionBankResDTO,
    TestSetQuestionBankListResDTO
} from './dto/testset-questionbank.zod-dto'
import {
    CreateTestSetQuestionBankBodyType,
    UpdateTestSetQuestionBankBodyType,
    GetTestSetQuestionBankByIdParamsType,
    GetTestSetQuestionBankByTestSetIdParamsType,
    UpdateQuestionOrderType
} from './entities/testset-questionbank.entities'
import {
    TestSetQuestionBankSwaggerDTO,
    CreateTestSetQuestionBankSwaggerDTO,
    UpdateTestSetQuestionBankSwaggerDTO,
    UpdateQuestionOrderSwaggerDTO,
    TestSetQuestionBankResponseSwaggerDTO,
    TestSetQuestionBankListResponseSwaggerDTO
} from './dto/testset-questionbank.dto'
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
    Put
} from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { TestSetQuestionBankService } from './testset-questionbank.service'

@ApiTags('TestSetQuestionBank')
@Controller('testset-questionbank')
export class TestSetQuestionBankController {
    constructor(private readonly testSetQuestionBankService: TestSetQuestionBankService) { }

    @Post()
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Tạo liên kết TestSet và QuestionBank',
        description: 'Tạo liên kết giữa một TestSet và một QuestionBank với thứ tự câu hỏi'
    })
    @ApiBody({
        type: CreateTestSetQuestionBankSwaggerDTO,
        description: 'Dữ liệu liên kết TestSet và QuestionBank mới'
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo liên kết thành công',
        type: TestSetQuestionBankResponseSwaggerDTO
    })
    async create(
        @Body() body: CreateTestSetQuestionBankBodyType,
        @ActiveUser('userId') userId: number
    ): Promise<MessageResDTO> {
        return this.testSetQuestionBankService.create(body)
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Lấy thông tin TestSetQuestionBank theo ID',
        description: 'Lấy thông tin chi tiết của một liên kết TestSet và QuestionBank'
    })
    @ApiParam({
        name: 'id',
        description: 'ID của TestSetQuestionBank',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy thông tin thành công',
        type: TestSetQuestionBankResponseSwaggerDTO
    })
    async findById(@Param() params: GetTestSetQuestionBankByIdParamsType): Promise<TestSetQuestionBankSwaggerDTO> {
        return this.testSetQuestionBankService.findById(params.id)
    }

    @Get('testset/:testSetId')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Lấy danh sách TestSetQuestionBank theo TestSet ID',
        description: 'Lấy tất cả liên kết TestSet và QuestionBank của một TestSet cụ thể'
    })
    @ApiParam({
        name: 'testSetId',
        description: 'ID của TestSet',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách thành công',
        type: TestSetQuestionBankListResponseSwaggerDTO
    })
    async findByTestSetId(@Param() params: GetTestSetQuestionBankByTestSetIdParamsType): Promise<MessageResDTO> {
        return this.testSetQuestionBankService.findByTestSetId(params.testSetId)
    }

    @Put(':id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Cập nhật TestSetQuestionBank',
        description: 'Cập nhật thông tin liên kết giữa TestSet và QuestionBank'
    })
    @ApiParam({
        name: 'id',
        description: 'ID của TestSetQuestionBank',
        example: 1
    })
    @ApiBody({
        type: UpdateTestSetQuestionBankSwaggerDTO,
        description: 'Dữ liệu cập nhật TestSetQuestionBank'
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật thành công',
        type: TestSetQuestionBankResponseSwaggerDTO
    })
    async update(
        @Param() params: GetTestSetQuestionBankByIdParamsType,
        @Body() body: UpdateTestSetQuestionBankBodyType
    ): Promise<MessageResDTO> {
        return this.testSetQuestionBankService.update(params.id, body)
    }

    @Put(':id/question-order')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Cập nhật thứ tự câu hỏi',
        description: 'Cập nhật thứ tự hiển thị của câu hỏi trong TestSet'
    })
    @ApiParam({
        name: 'id',
        description: 'ID của TestSetQuestionBank',
        example: 1
    })
    @ApiBody({
        type: UpdateQuestionOrderSwaggerDTO,
        description: 'Thứ tự mới của câu hỏi'
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật thứ tự thành công',
        type: TestSetQuestionBankResponseSwaggerDTO
    })
    async updateQuestionOrder(
        @Param() params: GetTestSetQuestionBankByIdParamsType,
        @Body() body: UpdateQuestionOrderType
    ): Promise<MessageResDTO> {
        return this.testSetQuestionBankService.updateQuestionOrder(params.id, body.questionOrder)
    }

    @Delete(':id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Xóa TestSetQuestionBank',
        description: 'Xóa liên kết giữa TestSet và QuestionBank'
    })
    @ApiParam({
        name: 'id',
        description: 'ID của TestSetQuestionBank',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa thành công',
        type: TestSetQuestionBankResponseSwaggerDTO
    })
    @HttpCode(HttpStatus.OK)
    async delete(@Param() params: GetTestSetQuestionBankByIdParamsType): Promise<MessageResDTO> {
        return this.testSetQuestionBankService.delete(params.id)
    }

    @Delete('testset/:testSetId')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Xóa tất cả TestSetQuestionBank theo TestSet ID',
        description: 'Xóa tất cả liên kết TestSet và QuestionBank của một TestSet cụ thể'
    })
    @ApiParam({
        name: 'testSetId',
        description: 'ID của TestSet',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa thành công',
        type: TestSetQuestionBankResponseSwaggerDTO
    })
    @HttpCode(HttpStatus.OK)
    async deleteByTestSetId(@Param() params: GetTestSetQuestionBankByTestSetIdParamsType): Promise<MessageResDTO> {
        return this.testSetQuestionBankService.deleteByTestSetId(params.testSetId)
    }
}
