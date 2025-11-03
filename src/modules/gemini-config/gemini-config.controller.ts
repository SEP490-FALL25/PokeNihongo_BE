import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Patch } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateGeminiConfigBodyDTO,
  CreateGeminiConfigResDTO,
  GetGeminiConfigResDTO,
  GetParamsGeminiConfigDTO,
  UpdateGeminiConfigBodyDTO,
  UpdateGeminiConfigResDTO
} from 'src/modules/gemini-config/dto/gemini-config.zod-dto'
import { CreateGeminiConfigSwaggerDTO, UpdateGeminiConfigSwaggerDTO } from './dto/gemini-config.dto'
import { GeminiConfigType } from '@prisma/client'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { MessageResDTO } from 'src/shared/dtos/response.dto'
import { GeminiConfigService } from './gemini-config.service'
import { GeminiConfigListQuerySwaggerDTO, GeminiModelListQuerySwaggerDTO, GeminiConfigModelListQuerySwaggerDTO } from './dto/gemini-config.query.dto'
import { CreateGeminiConfigModelSwaggerDTO, UpdateGeminiConfigModelSwaggerDTO } from './dto/gemini-config-model.dto'
import { CreateGeminiConfigModelBodyDTO, UpdateGeminiConfigModelBodyDTO, GeminiConfigModelResDTO } from './dto/gemini-config.zod-dto'
import { SchemaIntrospectService } from './schema-introspect.service'

@Controller('gemini-config')
@ApiBearerAuth()
export class GeminiConfigController {
  constructor(
    private readonly geminiConfigService: GeminiConfigService,
    private readonly schemaIntrospectService: SchemaIntrospectService
  ) { }

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  @ApiOperation({ summary: 'Danh sách Gemini Configs (có phân trang + lọc)' })
  @ApiQuery({ type: GeminiConfigListQuerySwaggerDTO })
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.geminiConfigService.list(query, lang)
  }

  // Removed legacy endpoints: findByConfigType and seedDefault (moved/replaced by new architecture)

  @Get('models')
  @ApiOperation({ summary: 'Danh sách Gemini Models (bảng GeminiModel)' })
  @ApiQuery({ type: GeminiModelListQuerySwaggerDTO })
  listModels(@I18nLang() lang: string) {
    return this.geminiConfigService.listModels(lang)
  }

  @Post('models/seed-default')
  @ApiOperation({ summary: 'Seed default Gemini models vào bảng GeminiModel' })
  seedDefaultModels(@I18nLang() lang: string) {
    return this.geminiConfigService.seedDefaultModels(lang)
  }

  // GeminiConfigModel endpoints (static paths first to avoid conflict with ":geminiConfigId")
  @Get('config-models')
  @ZodSerializerDto(PaginationResponseSchema)
  @ApiOperation({ summary: 'Danh sách Gemini Config Models (GeminiConfigModel) có phân trang + lọc' })
  @ApiQuery({ type: GeminiConfigModelListQuerySwaggerDTO })
  listConfigModels(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.geminiConfigService.listConfigModels(query as any, lang)
  }

  @Get('admin/schema')
  @ApiOperation({ summary: 'Liệt kê model/field (đã lọc an toàn) cho Admin cấu hình policy' })
  getAdminSchema() {
    return { statusCode: 200, data: this.schemaIntrospectService.listModels(), message: 'GET_SUCCESS' }
  }

  @Get('config-models/:id')
  @ApiOperation({ summary: 'Chi tiết Gemini Config Model theo ID' })
  @ApiParam({ name: 'id', type: Number, required: true, description: 'ID của GeminiConfigModel' })
  @ZodSerializerDto(GeminiConfigModelResDTO)
  getConfigModelById(@Param('id') id: number, @I18nLang() lang: string) {
    return this.geminiConfigService.findConfigModelById(Number(id), lang)
  }

  @Post('config-models')
  @ApiOperation({ summary: 'Tạo Gemini Config Model' })
  @ApiBody({ type: CreateGeminiConfigModelSwaggerDTO })
  @ZodSerializerDto(GeminiConfigModelResDTO)
  createConfigModel(@Body() body: CreateGeminiConfigModelBodyDTO, @ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.geminiConfigService.createConfigModel({ data: body, createdById: userId }, lang)
  }

  @Put('config-models/:id')
  @ApiOperation({ summary: 'Cập nhật Gemini Config Model' })
  @ApiParam({ name: 'id', type: Number, required: true, description: 'ID của GeminiConfigModel' })
  @ApiBody({ type: UpdateGeminiConfigModelSwaggerDTO })
  @ZodSerializerDto(GeminiConfigModelResDTO)
  updateConfigModel(
    @Param('id') id: number,
    @Body() body: UpdateGeminiConfigModelBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.updateConfigModel({ id: Number(id), data: body, updatedById: userId }, lang)
  }

  @Patch('config-models/:id/policy')
  @ApiOperation({ summary: 'Cập nhật policy AI vào extraParams.policy của GeminiConfigModel' })
  @ApiParam({ name: 'id', type: Number, required: true })
  @ApiBody({ schema: { example: { policy: { purpose: 'AI_KAIWA', entities: [{ entity: 'UserProgress', scope: 'SELF_ONLY', fields: ['lessonId'] }], maskingRules: { email: 'mask' } } } } })
  setConfigModelPolicy(
    @Param('id') id: number,
    @Body() body: { policy: any },
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.updateConfigModelPolicy({ id: Number(id), policy: body?.policy || {}, updatedById: userId }, lang)
  }

  @Delete('config-models/:id')
  @ApiOperation({ summary: 'Xoá mềm Gemini Config Model' })
  @ApiParam({ name: 'id', type: Number, required: true, description: 'ID của GeminiConfigModel' })
  deleteConfigModel(
    @Param('id') id: number,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.deleteConfigModel({ id: Number(id), deletedById: userId }, lang)
  }

  // Base GeminiConfig endpoints (dynamic path placed AFTER static routes)
  @Get(':geminiConfigId')
  @ApiOperation({ summary: 'Chi tiết Gemini Config theo ID' })
  @ApiParam({ name: 'geminiConfigId', type: Number, required: true, description: 'ID của GeminiConfig', example: 1 })
  @ZodSerializerDto(GetGeminiConfigResDTO)
  findById(@Param() params: GetParamsGeminiConfigDTO, @I18nLang() lang: string) {
    return this.geminiConfigService.findById(params.geminiConfigId, lang)
  }

  @Post("/promt")
  @ZodSerializerDto(CreateGeminiConfigResDTO)
  @ApiBody({ type: CreateGeminiConfigSwaggerDTO })
  create(
    @Body() body: CreateGeminiConfigBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':geminiConfigId')
  @ZodSerializerDto(UpdateGeminiConfigResDTO)
  @ApiParam({ name: 'geminiConfigId', type: Number, required: true, description: 'ID của GeminiConfig', example: 1 })
  @ApiBody({ type: UpdateGeminiConfigSwaggerDTO })
  update(
    @Body() body: UpdateGeminiConfigBodyDTO,
    @Param() params: GetParamsGeminiConfigDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.update(
      {
        data: body,
        id: params.geminiConfigId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':geminiConfigId')
  @ZodSerializerDto(MessageResDTO)
  @ApiParam({ name: 'geminiConfigId', type: Number, required: true, description: 'ID của GeminiConfig', example: 1 })
  delete(
    @Param() params: GetParamsGeminiConfigDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.delete(
      {
        id: params.geminiConfigId,
        deletedById: userId
      },
      lang
    )
  }
}

