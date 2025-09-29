import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
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
  constructor(private permissionRepo: PermissionRepo) {}

  async list(pagination: PaginationQueryType) {
    const data = await this.permissionRepo.list(pagination)
    return {
      data,
      message: 'Lấy danh sách quyền thành công'
    }
  }

  async findById(id: number) {
    const permission = await this.permissionRepo.findById(id)
    if (!permission) {
      throw NotFoundRecordException
    }
    return {
      data: permission,
      message: 'Lấy chi tiết quyền thành công'
    }
  }

  async create({
    data,
    createdById
  }: {
    data: CreatePermissionBodyType
    createdById: number
  }) {
    try {
      const result = await this.permissionRepo.create({
        createdById,
        data
      })
      return {
        data: result,
        message: 'Tạo permission thành công'
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw PermissionAlreadyExistsException
      }
      throw error
    }
  }

  async update({
    id,
    data,
    updatedById
  }: {
    id: number
    data: UpdatePermissionBodyType
    updatedById: number
  }) {
    try {
      const permission = await this.permissionRepo.update({
        id,
        updatedById,
        data
      })
      return {
        data: permission,
        message: 'Cập nhật permission thành công'
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw PermissionAlreadyExistsException
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      await this.permissionRepo.delete({
        id,
        deletedById
      })
      return {
        data: null,
        message: 'Delete successfully'
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }
}
