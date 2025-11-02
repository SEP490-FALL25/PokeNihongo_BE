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
  ) {}

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

  async findByConfigType(configType: PrismaGeminiConfigType, lang: string = 'vi') {
    await this.getLang(lang)
    const geminiConfig = await this.geminiConfigRepo.findByConfigType(configType)
    if (!geminiConfig) {
      throw new NotFoundRecordException()
    }
    return {
      statusCode: HttpStatus.OK,
      data: geminiConfig,
      message: this.i18nService.translate('GET_SUCCESS', lang)
    }
  }

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
}

