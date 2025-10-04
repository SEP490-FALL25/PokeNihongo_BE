import { TYPE_EFFECTIVENESS_MESSAGE } from '@/common/constants/message'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { TypeEffectivenessAlreadyExistsException } from './dto/type-effectiveness.error'
import {
  CreateTypeEffectivenessBodyType,
  UpdateTypeEffectivenessBodyType
} from './entities/type-effectiveness.entity'
import { TypeEffectivenessRepo } from './type-effectiveness.repo'

@Injectable()
export class TypeEffectivenessService {
  constructor(
    private typeEffectivenessRepo: TypeEffectivenessRepo,
    private prismaService: PrismaService
  ) {}

  async list(pagination: PaginationQueryType) {
    const data = await this.typeEffectivenessRepo.list(pagination)
    return {
      statusCode: HttpStatus.OK,
      data,
      message: TYPE_EFFECTIVENESS_MESSAGE.GET_LIST_SUCCESS
    }
  }

  async findById(id: number) {
    const typeEffectiveness = await this.typeEffectivenessRepo.findById(id)
    if (!typeEffectiveness) {
      throw NotFoundRecordException
    }
    return {
      statusCode: HttpStatus.OK,
      data: typeEffectiveness,
      message: TYPE_EFFECTIVENESS_MESSAGE.GET_SUCCESS
    }
  }

  async create({
    data,
    createdById
  }: {
    data: CreateTypeEffectivenessBodyType
    createdById: number
  }) {
    try {
      // Kiểm tra xem đã tồn tại effectiveness cho cặp attacker-defender này chưa
      const existingTypeEffectiveness =
        await this.typeEffectivenessRepo.findByAttackerDefender(
          data.attackerId,
          data.defenderId
        )
      if (existingTypeEffectiveness) {
        throw TypeEffectivenessAlreadyExistsException
      }

      const result = await this.typeEffectivenessRepo.create({
        createdById,
        data
      })
      return {
        statusCode: HttpStatus.CREATED,
        data: result,
        message: TYPE_EFFECTIVENESS_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw TypeEffectivenessAlreadyExistsException
      }
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      if (isForeignKeyConstraintPrismaError(error)) {
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
    data: UpdateTypeEffectivenessBodyType
    updatedById: number
  }) {
    try {
      const existTypeEffectiveness = await this.typeEffectivenessRepo.findById(id)
      if (!existTypeEffectiveness) {
        throw NotFoundRecordException
      }

      // Nếu update attackerId hoặc defenderId, kiểm tra xem có trùng với type effectiveness khác không
      if (
        (data.attackerId && data.attackerId !== existTypeEffectiveness.attackerId) ||
        (data.defenderId && data.defenderId !== existTypeEffectiveness.defenderId)
      ) {
        const attackerId = data.attackerId ?? existTypeEffectiveness.attackerId
        const defenderId = data.defenderId ?? existTypeEffectiveness.defenderId

        const existingTypeEffectiveness =
          await this.typeEffectivenessRepo.findByAttackerDefender(attackerId, defenderId)
        if (existingTypeEffectiveness && existingTypeEffectiveness.id !== id) {
          throw TypeEffectivenessAlreadyExistsException
        }
      }

      const typeEffectiveness = await this.typeEffectivenessRepo.update({
        id,
        updatedById,
        data
      })
      return {
        statusCode: HttpStatus.OK,
        data: typeEffectiveness,
        message: TYPE_EFFECTIVENESS_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw TypeEffectivenessAlreadyExistsException
      }
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      const existTypeEffectiveness = await this.typeEffectivenessRepo.findById(id)
      if (!existTypeEffectiveness) {
        throw NotFoundRecordException
      }

      await this.typeEffectivenessRepo.delete({ id, deletedById })
      return {
        statusCode: HttpStatus.OK,
        message: TYPE_EFFECTIVENESS_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }

  async getAllActiveEffectiveness() {
    const data = await this.typeEffectivenessRepo.getAllActiveEffectiveness()
    return {
      statusCode: HttpStatus.OK,
      data,
      message: TYPE_EFFECTIVENESS_MESSAGE.GET_LIST_SUCCESS
    }
  }

  async getEffectivenessMatrix() {
    const data = await this.typeEffectivenessRepo.getEffectivenessMatrix()
    return {
      statusCode: HttpStatus.OK,
      data,
      message: TYPE_EFFECTIVENESS_MESSAGE.GET_SUCCESS
    }
  }

  async getWeaknessesForDefender(defenderId: number) {
    const data = await this.typeEffectivenessRepo.getWeaknessesForDefender(defenderId)
    return {
      statusCode: HttpStatus.OK,
      data,
      message: TYPE_EFFECTIVENESS_MESSAGE.GET_LIST_SUCCESS
    }
  }

  async getResistancesForDefender(defenderId: number) {
    const data = await this.typeEffectivenessRepo.getResistancesForDefender(defenderId)
    return {
      statusCode: HttpStatus.OK,
      data,
      message: TYPE_EFFECTIVENESS_MESSAGE.GET_LIST_SUCCESS
    }
  }

  async calculateMultiTypeEffectiveness(defenderTypeIds: number[]) {
    // Tính toán weakness/resistance cho Pokémon có nhiều type
    const matrix = await this.typeEffectivenessRepo.getEffectivenessMatrix()
    const result = {
      weaknesses: {} as { [attackerType: string]: number },
      resistances: {} as { [attackerType: string]: number },
      immunities: {} as { [attackerType: string]: number }
    }

    // Lấy tất cả attacker types
    const attackerTypes = Object.keys(matrix)

    // Lấy thông tin defender types
    const defenderTypes: string[] = []
    for (const defenderId of defenderTypeIds) {
      const elementalType = await this.prismaService.elementalType.findFirst({
        where: { id: defenderId, deletedAt: null }
      })
      if (elementalType) {
        defenderTypes.push(elementalType.type_name)
      }
    }

    // Tính toán multiplier cho từng attacker type
    attackerTypes.forEach((attackerType) => {
      let totalMultiplier = 1

      defenderTypes.forEach((defenderType) => {
        const multiplier = matrix[attackerType]?.[defenderType] ?? 1
        totalMultiplier *= multiplier
      })

      if (totalMultiplier === 0) {
        result.immunities[attackerType] = totalMultiplier
      } else if (totalMultiplier > 1) {
        result.weaknesses[attackerType] = totalMultiplier
      } else if (totalMultiplier < 1) {
        result.resistances[attackerType] = totalMultiplier
      }
    })

    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: TYPE_EFFECTIVENESS_MESSAGE.GET_SUCCESS
    }
  }
}
