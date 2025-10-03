import { LEVEL_MESSAGE } from '@/common/constants/message'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import {
  ConflictTypeNextLevelException,
  LevelAlreadyExistsException
} from './dto/level.error'
import { CreateLevelBodyType, UpdateLevelBodyType } from './entities/level.entity'
import { LevelRepo } from './level.repo'

@Injectable()
export class LevelService {
  constructor(private levelRepo: LevelRepo) {}

  async list(pagination: PaginationQueryType) {
    const data = await this.levelRepo.list(pagination)
    return {
      data,
      message: LEVEL_MESSAGE.GET_LIST_SUCCESS
    }
  }

  async findById(id: number) {
    const level = await this.levelRepo.findById(id)
    if (!level) {
      throw NotFoundRecordException
    }
    return {
      data: level,
      message: 'Lấy danh mục thành công'
    }
  }

  async create({
    data,
    createdById
  }: {
    data: CreateLevelBodyType
    createdById: number
  }) {
    try {
      // check xem level o user hay pokemon da ton tai chua
      // const isExist = await this.levelRepo.findByLevelAndType(
      //   data.levelNumber,
      //   data.levelType
      // )
      // //ton tai thi throw ko thi tao
      // if (isExist) {
      //   throw LevelAlreadyExistsException
      // }

      const result = await this.levelRepo.create({
        createdById,
        data
      })
      return {
        data: result,
        message: LEVEL_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw LevelAlreadyExistsException
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
    data: UpdateLevelBodyType
    updatedById: number
  }) {
    try {
      const existLevel = await this.levelRepo.findById(id)
      if (!existLevel) {
        throw NotFoundRecordException
      }

      // neu update de lien ket level voi level ke tiep, phai giong type va level number phai hop le
      if (data.nextLevelId) {
        const nextLevel = await this.levelRepo.findById(data.nextLevelId)
        if (
          !nextLevel ||
          nextLevel.levelType !== existLevel.levelType ||
          nextLevel.levelNumber !== existLevel.levelNumber + 1
        ) {
          throw ConflictTypeNextLevelException
        }
      }

      const level = await this.levelRepo.update({
        id,
        updatedById,
        data
      })
      return {
        data: level,
        message: LEVEL_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw LevelAlreadyExistsException
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      await this.levelRepo.delete({
        id,
        deletedById
      })
      return {
        data: null,
        message: LEVEL_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }
}
