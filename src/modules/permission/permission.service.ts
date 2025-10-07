import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { I18nService } from 'src/i18n/i18n.service'
import { PermissionMessage } from 'src/i18n/message-keys'
import { PermissionAlreadyExistsException } from 'src/modules/permission/permission.error'
import {
  CreatePermissionBodyType,
  UpdatePermissionBodyType
} from 'src/modules/permission/permission.model'
import { PermissionRepo } from 'src/modules/permission/permission.repo'
import { NotFoundRecordException } from 'src/shared/error'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from 'src/shared/helpers'

@Injectable()
export class PermissionService {
  constructor(
    private permissionRepo: PermissionRepo,
    private i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string) {
    const data = await this.permissionRepo.list(pagination)
    return {
      data,
      message: this.i18nService.translate(PermissionMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string) {
    const permission = await this.permissionRepo.findById(id)
    if (!permission) {
      throw new NotFoundRecordException()
    }
    return {
      data: permission,
      message: this.i18nService.translate(PermissionMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreatePermissionBodyType
      createdById: number
    },
    lang: string
  ) {
    try {
      const result = await this.permissionRepo.create({
        createdById,
        data
      })
      return {
        data: result,
        message: this.i18nService.translate(PermissionMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new PermissionAlreadyExistsException()
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
      data: UpdatePermissionBodyType
      updatedById: number
    },
    lang: string
  ) {
    try {
      const permission = await this.permissionRepo.update({
        id,
        updatedById,
        data
      })
      return {
        data: permission,
        message: this.i18nService.translate(PermissionMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new PermissionAlreadyExistsException()
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }, lang: string) {
    try {
      await this.permissionRepo.delete({
        id,
        deletedById
      })
      return {
        data: null,
        message: this.i18nService.translate(PermissionMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
