import { LevelTypeType } from '@/common/constants/level.constant'
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
      // Tạo level trước
      const result = await this.levelRepo.create({
        createdById,
        data
      })

      // Sau khi tạo thành công, tự động liên kết với các level liền kề
      await this.autoLinkLevels(result.id, data.levelNumber, data.levelType)

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

      // Nếu có thay đổi levelNumber hoặc levelType, tự động liên kết lại
      if (data.levelNumber !== undefined || data.levelType !== undefined) {
        const newLevelNumber = data.levelNumber ?? existLevel.levelNumber
        const newLevelType = data.levelType ?? existLevel.levelType
        await this.autoLinkLevels(id, newLevelNumber, newLevelType)
      }

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

  /**
   * Tự động liên kết level với các level liền kề
   * - Tìm level có levelNumber + 1 cùng type → set làm nextLevel
   * - Tìm level có levelNumber - 1 cùng type → cập nhật level đó để trỏ đến level hiện tại
   */
  private async autoLinkLevels(
    levelId: number,
    levelNumber: number,
    levelType: LevelTypeType
  ) {
    try {
      // 1. Tìm level kế tiếp (levelNumber + 1)
      const nextLevel = await this.levelRepo.findNextLevelByNumber(levelNumber, levelType)

      // 2. Tìm level trước đó (levelNumber - 1)
      const prevLevel = await this.levelRepo.findPrevLevelByNumber(levelNumber, levelType)

      // 3. Cập nhật nextLevel cho level hiện tại
      if (nextLevel) {
        await this.levelRepo.updateNextLevel(levelId, nextLevel.id)
      }

      // 4. Cập nhật nextLevel cho level trước đó (trỏ đến level hiện tại)
      if (prevLevel) {
        await this.levelRepo.updateNextLevel(prevLevel.id, levelId)
      }
    } catch (error) {
      console.error('Error in autoLinkLevels:', error)
      // Không throw error để không ảnh hưởng đến việc tạo/update level chính
    }
  }
}
