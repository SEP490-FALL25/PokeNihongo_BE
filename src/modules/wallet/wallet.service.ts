import { I18nService } from '@/i18n/i18n.service'
import { WalletMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { WalletAlreadyExistsException } from './dto/wallet.error'
import { CreateWalletBodyType, UpdateWalletBodyType } from './entities/wallet.entity'
import { WalletRepo } from './wallet.repo'

@Injectable()
export class WalletService {
  constructor(
    private walletRepo: WalletRepo,
    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.walletRepo.list(pagination)
    return {
      data,
      message: this.i18nService.translate(WalletMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const wallet = await this.walletRepo.findById(id)
    if (!wallet) {
      throw new NotFoundRecordException()
    }
    return {
      data: wallet,
      message: this.i18nService.translate(WalletMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateWalletBodyType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.walletRepo.create({
        createdById,
        data
      })
      return {
        data: result,
        message: this.i18nService.translate(WalletMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new WalletAlreadyExistsException()
      }
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
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
      data: UpdateWalletBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const wallet = await this.walletRepo.update({
        id,
        updatedById,
        data
      })
      return {
        data: wallet,
        message: this.i18nService.translate(WalletMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new WalletAlreadyExistsException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.walletRepo.delete({
        id,
        deletedById
      })
      return {
        data: null,
        message: this.i18nService.translate(WalletMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
