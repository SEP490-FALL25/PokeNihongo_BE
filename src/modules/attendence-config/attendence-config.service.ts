import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'

import { I18nService } from '@/i18n/i18n.service'
import { AttendenceConfigMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from 'src/shared/error'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from 'src/shared/helpers'
import { LanguagesRepository } from '../languages/languages.repo'
import { AttendenceConfigRepo } from './attendence-config.repo'
import { AttendenceConfigAlreadyExistsException } from './dto/attendence-config.error'
import {
  CreateAttendanceConfigBodyType,
  UpdateAttendanceConfigBodyType
} from './entities/attendence-config.entity'

@Injectable()
export class AttendenceConfigService {
  constructor(
    private attendenceConfigRepo: AttendenceConfigRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepository
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    await this.getLand(lang)
    const data = await this.attendenceConfigRepo.list(pagination)
    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate(AttendenceConfigMessage.GET_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    await this.getLand(lang)
    const attendenceConfig = await this.attendenceConfigRepo.findById(id)
    if (!attendenceConfig) {
      throw new NotFoundRecordException()
    }
    return {
      statusCode: HttpStatus.OK,
      data: attendenceConfig,
      message: this.i18nService.translate(AttendenceConfigMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateAttendanceConfigBodyType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      await this.getLand(lang)
      const attendenceConfig = await this.attendenceConfigRepo.create({
        createdById,
        data
      })
      return {
        statusCode: HttpStatus.CREATED,
        data: attendenceConfig,
        message: this.i18nService.translate(AttendenceConfigMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new AttendenceConfigAlreadyExistsException()
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
      data: UpdateAttendanceConfigBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      await this.getLand(lang)
      const updatedAttendenceConfig = await this.attendenceConfigRepo.update({
        id,
        updatedById,
        data
      })
      return {
        statusCode: HttpStatus.OK,
        data: updatedAttendenceConfig,
        message: this.i18nService.translate(AttendenceConfigMessage.GET_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new AttendenceConfigAlreadyExistsException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.getLand(lang)
      await this.attendenceConfigRepo.delete({
        id,
        deletedById
      })
      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(AttendenceConfigMessage.GET_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async getLand(lang: string) {
    const langId = await this.languageRepo.getIdByCode(lang)
    if (!langId) {
      throw new NotFoundRecordException()
    }
    return langId
  }
}
