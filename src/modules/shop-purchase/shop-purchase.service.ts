import {
  WalletTransactionSourceType,
  WalletTransactionType,
  walletPurposeType
} from '@/common/constants/wallet-transaction.constant'
import { walletType } from '@/common/constants/wallet.constant'
import { I18nService } from '@/i18n/i18n.service'
import { ShopPurchaseMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { ShopItemRepo } from '../shop-item/shop-item.repo'
import { UserHasPokemonException } from '../user-pokemon/dto/user-pokemon.error'
import { UserPokemonRepo } from '../user-pokemon/user-pokemon.repo'
import { UserPokemonService } from '../user-pokemon/user-pokemon.service'
import { WalletTransactionRepo } from '../wallet-transaction/wallet-transaction.repo'
import { WalletRepo } from '../wallet/wallet.repo'
import {
  NotEnoughBalanceException,
  ShopPurchaseNotFoundException
} from './dto/shop-purchase.error'
import {
  CreateShopPurchaseBodyType,
  UpdateShopPurchaseBodyType
} from './entities/shop-purchase.entity'
import { ShopPurchaseRepo } from './shop-purchase.repo'

@Injectable()
export class ShopPurchaseService {
  constructor(
    private shopPurchaseRepo: ShopPurchaseRepo,
    private readonly i18nService: I18nService,
    private readonly shopItemRepo: ShopItemRepo,
    private readonly walletRepo: WalletRepo,
    private readonly walletTransRepo: WalletTransactionRepo,
    private readonly userPokemonRepo: UserPokemonRepo,
    private readonly userPokemonService: UserPokemonService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.shopPurchaseRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(ShopPurchaseMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const shopPurchase = await this.shopPurchaseRepo.findById(id)
    if (!shopPurchase) {
      throw new ShopPurchaseNotFoundException()
    }

    return {
      statusCode: 200,
      data: shopPurchase,
      message: this.i18nService.translate(ShopPurchaseMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateShopPurchaseBodyType },
    lang: string = 'vi'
  ) {
    try {
      // co item hong
      const shopItem = await this.shopItemRepo.findById(data.shopItemId)
      if (!shopItem) throw new NotFoundRecordException()

      // 2)tong tien ne
      const totalPrice = data.quantity * shopItem.price

      // 3)may co du tien ko ?
      const [userWallet, existed] = await Promise.all([
        this.walletRepo.checkEnoughBalance({
          userId,
          type: walletType.FREE_COIN,
          amount: totalPrice
        }),
        this.userPokemonRepo.findByUserAndPokemon(userId, shopItem.pokemonId)
      ])
      // ko du ma doi mua ha ?
      if (!userWallet) throw new NotEnoughBalanceException()

      // 3.5) user da co pokemon nay chua
      if (existed) {
        throw new UserHasPokemonException()
      }

      // 4) transaction
      const result = await this.shopPurchaseRepo.withTransaction(async (prismaTx) => {
        // 4.1) tao lich su mua hang (tam thoi chua co walletTransId) va tru tien no
        const [purchase, updatedWallet] = await Promise.all([
          this.shopPurchaseRepo.create(
            {
              createdById: userId,
              data: {
                userId,
                shopItemId: data.shopItemId,
                walletTransId: null,
                quantity: data.quantity,
                totalPrice
              }
            },
            prismaTx
          ),
          this.walletRepo.minusBalanceToWalletWithTypeUserId(
            { userId, type: walletType.FREE_COIN, amount: totalPrice },
            prismaTx
          )
        ])

        // ko du la chui
        if (!updatedWallet) throw new NotEnoughBalanceException()

        // 4.3) Create Wallet Transaction referencing the purchase
        const walletTrans = await this.walletTransRepo.create(
          {
            createdById: userId,
            data: {
              walletId: updatedWallet.id,
              userId,
              purpose: walletPurposeType.SHOP,
              referenceId: purchase.id,
              amount: totalPrice,
              type: WalletTransactionType.DECREASE,
              source: WalletTransactionSourceType.SHOP_PURCHASE,
              description: `Shop purchase ${purchase.id}`
            }
          },
          prismaTx
        )

        // 4.4) Update purchase with walletTransId
        // Add Pokemon to user inventory (level 1, nickname null, isMain false)

        const [finalPurchase] = await Promise.all([
          this.shopPurchaseRepo.update(
            {
              id: purchase.id,
              data: { walletTransId: walletTrans.id },
              updatedById: userId
            },
            prismaTx
          ),
          await this.userPokemonService.addPokemonByShop(
            { userId, pokemonId: shopItem.pokemonId },
            prismaTx as any
          )
        ])

        return finalPurchase
      })

      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(ShopPurchaseMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) throw new NotFoundRecordException()
      if (isForeignKeyConstraintPrismaError(error)) throw new NotFoundRecordException()
      throw error
    }
  }

  async update(
    {
      id,
      data,
      userId
    }: {
      id: number
      data: UpdateShopPurchaseBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      // 0) lay cai purchase ra
      const existing = await this.shopPurchaseRepo.findById(id)
      if (!existing) throw new ShopPurchaseNotFoundException()

      // 1) xem coi item moi hay cu, co doi so luong ko
      const effectiveShopItemId = data.shopItemId ?? existing.shopItemId
      const effectiveQuantity = data.quantity ?? existing.quantity

      // 2) lay ra item de tinh tien
      const shopItem = await this.shopItemRepo.findById(effectiveShopItemId)
      if (!shopItem) throw new NotFoundRecordException()

      // 3) Compute totals
      const oldTotal = existing.totalPrice
      const newTotal = effectiveQuantity * shopItem.price

      // 4) transaction
      const result = await this.shopPurchaseRepo.withTransaction(async (prismaTx) => {
        // 4.1) If total changed: refund old, then charge new
        if (newTotal !== oldTotal) {
          // nhet lai tien cu ve vi
          const walletAfterRefund = await this.walletRepo.addBalanceToWalletWithType(
            { userId: existing.userId, type: walletType.FREE_COIN, amount: oldTotal },
            prismaTx
          )
          if (!walletAfterRefund) throw new NotEnoughBalanceException()

          // Log refund transaction (INCREASE)
          await this.walletTransRepo.create(
            {
              createdById: userId,
              data: {
                walletId: walletAfterRefund.id,
                userId: existing.userId,
                purpose: walletPurposeType.SHOP,
                referenceId: id,
                amount: oldTotal,
                type: WalletTransactionType.INCREASE,
                source: WalletTransactionSourceType.SHOP_PURCHASE,
                description: `Refund previous total for purchase ${id}`
              }
            },
            prismaTx
          )

          //check coi du tien ko
          if ((walletAfterRefund as any).balance < newTotal) {
            // Optional: check current wallet if needed; here we guard via balance on returned entity
            throw new NotEnoughBalanceException()
          }

          // tru tien ra
          const walletAfterCharge =
            await this.walletRepo.minusBalanceToWalletWithTypeUserId(
              { userId: existing.userId, type: walletType.FREE_COIN, amount: newTotal },
              prismaTx
            )
          if (!walletAfterCharge) throw new NotEnoughBalanceException()

          // Log charge transaction (DECREASE)
          await this.walletTransRepo.create(
            {
              createdById: userId,
              data: {
                walletId: walletAfterCharge.id,
                userId: existing.userId,
                purpose: walletPurposeType.SHOP,
                referenceId: id,
                amount: newTotal,
                type: WalletTransactionType.DECREASE,
                source: WalletTransactionSourceType.SHOP_PURCHASE,
                description: `Charge new total for purchase ${id}`
              }
            },
            prismaTx
          )
        }

        // 4.2) Update purchase record
        const updated = await this.shopPurchaseRepo.update(
          {
            id,
            data: {
              ...data,
              shopItemId: effectiveShopItemId,
              quantity: effectiveQuantity,
              totalPrice: newTotal
            } as any,
            updatedById: userId
          },
          prismaTx
        )
        return updated
      })

      return {
        statusCode: 200,
        data: result,
        message: this.i18nService.translate(ShopPurchaseMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new ShopPurchaseNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existShopPurchase = await this.shopPurchaseRepo.findById(id)
      if (!existShopPurchase) throw new ShopPurchaseNotFoundException()

      await this.shopPurchaseRepo.withTransaction(async (prismaTx) => {
        // 1) Refund full amount to wallet
        const walletAfterRefund = await this.walletRepo.addBalanceToWalletWithType(
          {
            userId: existShopPurchase.userId,
            type: walletType.FREE_COIN,
            amount: existShopPurchase.totalPrice
          },
          prismaTx
        )
        if (!walletAfterRefund) throw new NotFoundRecordException()

        // 2) Log refund transaction
        await this.walletTransRepo.create(
          {
            createdById: userId,
            data: {
              walletId: walletAfterRefund.id,
              userId: existShopPurchase.userId,
              purpose: walletPurposeType.SHOP,
              referenceId: id,
              amount: existShopPurchase.totalPrice,
              type: WalletTransactionType.INCREASE,
              source: WalletTransactionSourceType.SHOP_PURCHASE,
              description: `Refund on delete purchase ${id}`
            }
          },
          prismaTx
        )

        // 3) Soft delete purchase
        await this.shopPurchaseRepo.delete(id, false, prismaTx)
      })

      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(ShopPurchaseMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new ShopPurchaseNotFoundException()
      }
      throw error
    }
  }

  async getByUser(userId: number, lang: string = 'vi') {
    const data = await this.shopPurchaseRepo.findByUserId(userId)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(ShopPurchaseMessage.GET_LIST_SUCCESS, lang)
    }
  }
}
