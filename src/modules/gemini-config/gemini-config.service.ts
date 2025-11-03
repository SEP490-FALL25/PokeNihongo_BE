import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { GeminiConfigType as PrismaGeminiConfigType } from '@prisma/client'
import { I18nService } from '@/i18n/i18n.service'
import { NotFoundRecordException } from 'src/shared/error'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from 'src/shared/helpers'
import { LanguagesRepository } from '../languages/languages.repo'
import { GeminiConfigRepo } from './gemini-config.repo'
import { GeminiConfigAlreadyExistsException } from './dto/gemini-config.error'
import {
  CreateGeminiConfigBodyType,
  UpdateGeminiConfigBodyType
} from './entities/gemini-config.entity'

@Injectable()
export class GeminiConfigService {
  constructor(
    private geminiConfigRepo: GeminiConfigRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepository
  ) { }

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    await this.getLang(lang)
    const data = await this.geminiConfigRepo.list(pagination)
    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate('GET_SUCCESS', lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    await this.getLang(lang)
    const geminiConfig = await this.geminiConfigRepo.findById(id)
    if (!geminiConfig) {
      throw new NotFoundRecordException()
    }
    return {
      statusCode: HttpStatus.OK,
      data: geminiConfig,
      message: this.i18nService.translate('GET_SUCCESS', lang)
    }
  }

  // removed legacy findByConfigType; use service-config mapping APIs instead

  async create(
    {
      data,
      createdById
    }: {
      data: CreateGeminiConfigBodyType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      await this.getLang(lang)
      if (data.geminiConfigModelId && !(await this.geminiConfigRepo.existsConfigModel(data.geminiConfigModelId))) {
        throw new NotFoundRecordException()
      }
      const geminiConfig = await this.geminiConfigRepo.create({
        createdById,
        data
      })
      return {
        statusCode: HttpStatus.CREATED,
        data: geminiConfig,
        message: this.i18nService.translate('CREATE_SUCCESS', lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new GeminiConfigAlreadyExistsException()
      }
      throw error
    }
  }

  async update(
    {
      id,
      data,
      updatedById
    }: {
      id: number
      data: UpdateGeminiConfigBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      await this.getLang(lang)
      if (data.geminiConfigModelId && !(await this.geminiConfigRepo.existsConfigModel(data.geminiConfigModelId))) {
        throw new NotFoundRecordException()
      }
      const updatedGeminiConfig = await this.geminiConfigRepo.update({
        id,
        updatedById,
        data
      })
      return {
        statusCode: HttpStatus.OK,
        data: updatedGeminiConfig,
        message: this.i18nService.translate('UPDATE_SUCCESS', lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new GeminiConfigAlreadyExistsException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.getLang(lang)
      await this.geminiConfigRepo.delete({
        id,
        deletedById
      })
      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate('DELETE_SUCCESS', lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async getLang(lang: string) {
    const langId = await this.languageRepo.getIdByCode(lang)
    if (!langId) {
      throw new NotFoundRecordException()
    }
    return langId
  }

  // removed legacy seedDefaultConfigs; configs are created explicitly with geminiConfigModelId

  async listModels(lang: string = 'vi') {
    await this.getLang(lang)
    const data = await this.geminiConfigRepo.listModels()
    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate('GET_SUCCESS', lang)
    }
  }

  async seedDefaultModels(lang: string = 'vi') {
    await this.getLang(lang)
    const data = await this.geminiConfigRepo.seedDefaultModels()
    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate('UPDATE_SUCCESS', lang)
    }
  }

  async listDistinctModelNames(fromActiveOnly: boolean = true, lang: string = 'vi') {
    await this.getLang(lang)
    const data = await this.geminiConfigRepo.listDistinctModelNamesFromConfigs(fromActiveOnly)
    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate('GET_SUCCESS', lang)
    }
  }

  async listAllModelNames(lang: string = 'vi') {
    await this.getLang(lang)
    const models = await this.geminiConfigRepo.listModels()
    const names = (models || []).map((m: any) => m.key).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b))
    return {
      statusCode: HttpStatus.OK,
      data: names,
      message: this.i18nService.translate('GET_SUCCESS', lang)
    }
  }

  // GeminiConfigModel CRUD
  async listConfigModels(pagination: PaginationQueryType, lang: string = 'vi') {
    await this.getLang(lang)
    const data = await this.geminiConfigRepo.listConfigModels(pagination)
    return { statusCode: HttpStatus.OK, data, message: this.i18nService.translate('GET_SUCCESS', lang) }
  }

  async findConfigModelById(id: number, lang: string = 'vi') {
    await this.getLang(lang)
    const item = await this.geminiConfigRepo.findConfigModelById(id)
    if (!item) throw new NotFoundRecordException()
    return { statusCode: HttpStatus.OK, data: item, message: this.i18nService.translate('GET_SUCCESS', lang) }
  }

  async createConfigModel({ data, createdById }: { data: any; createdById: number }, lang: string = 'vi') {
    try {
      await this.getLang(lang)
      const created = await this.geminiConfigRepo.createConfigModel({ data, createdById })
      return { statusCode: HttpStatus.OK, data: created, message: this.i18nService.translate('CREATE_SUCCESS', lang) }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new GeminiConfigAlreadyExistsException()
      }
      throw error
    }
  }

  async updateConfigModel({ id, data, updatedById }: { id: number; data: any; updatedById: number }, lang: string = 'vi') {
    try {
      await this.getLang(lang)
      const updated = await this.geminiConfigRepo.updateConfigModel({ id, data, updatedById })
      return { statusCode: HttpStatus.OK, data: updated, message: this.i18nService.translate('UPDATE_SUCCESS', lang) }
    } catch (error) {
      if (isNotFoundPrismaError(error)) throw new NotFoundRecordException()
      if (isUniqueConstraintPrismaError(error)) throw new GeminiConfigAlreadyExistsException()
      throw error
    }
  }

  async deleteConfigModel({ id, deletedById }: { id: number; deletedById: number }, lang: string = 'vi') {
    try {
      await this.getLang(lang)
      await this.geminiConfigRepo.deleteConfigModel({ id, deletedById })
      return { statusCode: HttpStatus.OK, data: null, message: this.i18nService.translate('DELETE_SUCCESS', lang) }
    } catch (error) {
      if (isNotFoundPrismaError(error)) throw new NotFoundRecordException()
      throw error
    }
  }
}

