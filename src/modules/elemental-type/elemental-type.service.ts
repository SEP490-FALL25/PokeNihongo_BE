import { ELEMENTAL_TYPE_MESSAGE } from '@/common/constants/message'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { ElementalTypeAlreadyExistsException } from './dto/elemental-type.error'
import { ElementalTypeRepo } from './elemental-type.repo'
import {
  CreateElementalTypeBodyType,
  UpdateElementalTypeBodyType
} from './entities/elemental-type.entity'

@Injectable()
export class ElementalTypeService {
  constructor(private elementalTypeRepo: ElementalTypeRepo) {}

  async list(pagination: PaginationQueryType) {
    const data = await this.elementalTypeRepo.list(pagination)
    return {
      statusCode: HttpStatus.OK,
      data,
      message: ELEMENTAL_TYPE_MESSAGE.GET_LIST_SUCCESS
    }
  }

  async findById(id: number) {
    const elementalType = await this.elementalTypeRepo.findById(id)
    if (!elementalType) {
      throw NotFoundRecordException
    }
    return {
      data: elementalType,
      message: ELEMENTAL_TYPE_MESSAGE.GET_SUCCESS
    }
  }

  async create({
    data,
    createdById
  }: {
    data: CreateElementalTypeBodyType
    createdById: number
  }) {
    try {
      // Kiểm tra xem type_name đã tồn tại chưa
      const existingType = await this.elementalTypeRepo.findByTypeName(data.type_name)
      if (existingType) {
        throw ElementalTypeAlreadyExistsException
      }

      const result = await this.elementalTypeRepo.create({
        createdById,
        data
      })
      return {
        statusCode: HttpStatus.CREATED,
        data: result,
        message: ELEMENTAL_TYPE_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw ElementalTypeAlreadyExistsException
      }
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
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
    data: UpdateElementalTypeBodyType
    updatedById: number
  }) {
    try {
      const existElementalType = await this.elementalTypeRepo.findById(id)
      if (!existElementalType) {
        throw NotFoundRecordException
      }

      // Nếu update type_name, kiểm tra xem có trùng với type khác không
      if (data.type_name && data.type_name !== existElementalType.type_name) {
        const existingType = await this.elementalTypeRepo.findByTypeName(data.type_name)
        if (existingType) {
          throw ElementalTypeAlreadyExistsException
        }
      }

      const elementalType = await this.elementalTypeRepo.update({
        id,
        updatedById,
        data
      })
      return {
        statusCode: HttpStatus.OK,
        data: elementalType,
        message: ELEMENTAL_TYPE_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw ElementalTypeAlreadyExistsException
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      await this.elementalTypeRepo.delete({
        id,
        deletedById
      })
      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: ELEMENTAL_TYPE_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }

  async getAllActiveTypes() {
    const data = await this.elementalTypeRepo.getAllActiveTypes()
    return {
      statusCode: HttpStatus.OK,
      data,
      message: ELEMENTAL_TYPE_MESSAGE.GET_LIST_SUCCESS
    }
  }
}
