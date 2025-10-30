import { GachaPityType } from '@/common/constants/gacha.constant'
import { GachaBannerStatus } from '@/common/constants/shop-banner.constant'
import {
  WalletTransactionSourceType,
  WalletTransactionType,
  walletPurposeType
} from '@/common/constants/wallet-transaction.constant'
import { walletType } from '@/common/constants/wallet.constant'
import { I18nService } from '@/i18n/i18n.service'
import { GachaPurchaseMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { GachaBannerRepo } from '../gacha-banner/gacha-banner.repo'
import { GachaItemRateType } from '../gacha-item-rate/entities/gacha-item-rate.entity'
import { InvalidGachaBannerException } from '../gacha-item/dto/gacha-item.error'
import { GachaItemType } from '../gacha-item/entities/gacha-item.entity'
import { GachaItemRepo } from '../gacha-item/gacha-item.repo'
import { PokemonRepo } from '../pokemon/pokemon.repo'
import { UserGachaPityRepo } from '../user-gacha-pity/user-gacha-pity.repo'
import { UserPokemonRepo } from '../user-pokemon/user-pokemon.repo'
import { UserPokemonService } from '../user-pokemon/user-pokemon.service'
import { WalletTransactionRepo } from '../wallet-transaction/wallet-transaction.repo'
import { WalletRepo } from '../wallet/wallet.repo'
import {
  GachaPurchaseNotFoundException,
  NotEnoughBalanceException
} from './dto/gacha-purchase.error'
import { CreateGachaPurchaseBodyType } from './entities/gacha-purchase.entity'
import { GachaPurchaseRepo } from './gacha-purchase.repo'

@Injectable()
export class GachaPurchaseService {
  constructor(
    private gachaPurchaseRepo: GachaPurchaseRepo,
    private readonly i18nService: I18nService,
    private readonly gachaBannerRepo: GachaBannerRepo,
    private readonly gachaItemRepo: GachaItemRepo,
    private readonly userGachaPityRepo: UserGachaPityRepo,
    private readonly walletRepo: WalletRepo,
    private readonly walletTransRepo: WalletTransactionRepo,
    private readonly userPokemonRepo: UserPokemonRepo,
    private readonly userPokemonService: UserPokemonService,
    private readonly pokemonRepo: PokemonRepo
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.gachaPurchaseRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(GachaPurchaseMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const gachaPurchase = await this.gachaPurchaseRepo.findById(id)
    if (!gachaPurchase) {
      throw new GachaPurchaseNotFoundException()
    }

    return {
      statusCode: 200,
      data: gachaPurchase,
      message: this.i18nService.translate(GachaPurchaseMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateGachaPurchaseBodyType },
    lang: string = 'vi'
  ) {
    try {
      //tìm ra gachabanner và pity user

      const [gachaBanner, userPityExist] = await Promise.all([
        this.gachaBannerRepo.findByIdWithItemWithitemRate(data.bannerId),
        this.userGachaPityRepo.findStatusByUserId(userId, GachaPityType.PENDING)
      ])
      if (
        !gachaBanner ||
        gachaBanner.status !== GachaBannerStatus.ACTIVE ||
        gachaBanner.items.length === 0
      ) {
        throw new InvalidGachaBannerException()
      }
      let userPity =
        userPityExist === null
          ? await this.userGachaPityRepo.create({
              createdById: userId,
              data: {
                userId,
                status: GachaPityType.PENDING,
                pityCount: 0
              }
            })
          : userPityExist

      // Tách 2 mảng
      // 1 cái là list để random, 1 cái là tỉ lệ
      const items: GachaItemType[] = gachaBanner.items.map(
        ({ gachaItemRate, ...rest }) => rest
      )
      const gachaItemRates: GachaItemRateType[] = gachaBanner.items.map(
        ({ gachaItemRate }) => gachaItemRate
      )
      const rollCount = data.rollCount || 1
      // Gộp lại để dễ random
      const gachaPool = items.map((item) => {
        const rateObj = gachaItemRates.find((r) => r.id === item.gachaItemRateId)
        return {
          id: item.id,
          rate: rateObj?.rate ?? 0,
          starType: rateObj?.starType ?? 'ONE'
        }
      })

      // Gacha roll logic
      let pityCount = userPity.pityCount
      const results: typeof gachaPool = []

      // chạy roll theo count
      for (let i = 0; i < rollCount; i++) {
        const { result, pityCount: newPity } = this.rollGacha(gachaPool, pityCount)
        results.push(result)
        pityCount = newPity
      }

      // Nếu rollCount = 10 => đảm bảo có ít nhất 1 con ≥ 3★
      if (data.rollCount === 10) {
        const hasHighStar = results.some(
          (r) => r.starType === 'THREE' || r.starType === 'FOUR' || r.starType === 'FIVE'
        )

        if (!hasHighStar) {
          // Tìm tất cả 3★ trong pool
          const threeStarPool = gachaPool.filter(
            (r) => r.starType === 'THREE' || r.starType === 'FOUR'
          )

          if (threeStarPool.length > 0) {
            // Chọn ngẫu nhiên 1 con 3★
            const guaranteed =
              threeStarPool[Math.floor(Math.random() * threeStarPool.length)]

            // Tìm ngẫu nhiên 1 con có 1★ hoặc 2★ để thay thế
            const lowStarIndexes = results
              .map((r, i) => (r.starType === 'ONE' || r.starType === 'TWO' ? i : -1))
              .filter((i) => i !== -1)

            if (lowStarIndexes.length > 0) {
              const replaceIndex =
                lowStarIndexes[Math.floor(Math.random() * lowStarIndexes.length)]
              results[replaceIndex] = guaranteed
            }
          }
        }
      }

      // 4) transaction
      const result = await this.gachaPurchaseRepo.withTransaction(async (prismaTx) => {
        // 4.1) tao lich su mua hang (tam thoi chua co walletTransId) va tru tien no
        const [purchase, updatedWallet] = await Promise.all([
          this.gachaPurchaseRepo.create(
            {
              createdById: userId,
              data: {
                userId,
                gachaItemId: data.gachaItemId,
                walletTransId: null,
                quantity: data.quantity,
                totalPrice
              }
            },
            prismaTx
          ),
          this.walletRepo.minusBalanceToWalletWithTypeUserId(
            { userId, type: walletType.SPARKLES, amount: totalPrice },
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
              description: `Gacha purchase ${purchase.id}`
            }
          },
          prismaTx
        )

        // 4.4) Update purchase with walletTransId
        // Add Pokemon to user inventory (level 1, nickname null, isMain false)

        const [finalPurchase] = await Promise.all([
          this.gachaPurchaseRepo.update(
            {
              id: purchase.id,
              data: { walletTransId: walletTrans.id },
              updatedById: userId
            },
            prismaTx
          ),
          this.userPokemonService.addPokemonByGacha(
            { userId, pokemonId: gachaItem.pokemonId },
            prismaTx as any
          ),
          this.gachaItemRepo.incrementPurchasedCount(
            data.gachaItemId,
            data.quantity,
            prismaTx
          )
        ])

        return finalPurchase
      })

      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(GachaPurchaseMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      console.log('vo catch')

      if (isNotFoundPrismaError(error)) throw new NotFoundRecordException()
      if (isForeignKeyConstraintPrismaError(error)) throw new NotFoundRecordException()
      throw error
    }
  }

  // async update(
  //   {
  //     id,
  //     data,
  //     userId
  //   }: {
  //     id: number
  //     data: UpdateGachaPurchaseBodyType
  //     userId?: number
  //   },
  //   lang: string = 'vi'
  // ) {
  //   try {
  //     // 0) lay cai purchase ra
  //     const existing = await this.gachaPurchaseRepo.findById(id)
  //     if (!existing) throw new GachaPurchaseNotFoundException()

  //     // 1) xem coi item moi hay cu, co doi so luong ko
  //     const effectiveGachaItemId = data.gachaItemId ?? existing.gachaItemId
  //     const effectiveQuantity = data.quantity ?? existing.quantity

  //     // 2) lay ra item de tinh tien
  //     const gachaItem = await this.gachaItemRepo.findById(effectiveGachaItemId)
  //     if (!gachaItem) throw new NotFoundRecordException()

  //     // 3) Compute totals
  //     const oldTotal = existing.totalPrice
  //     const newTotal = effectiveQuantity * gachaItem.price

  //     // 4) transaction
  //     const result = await this.gachaPurchaseRepo.withTransaction(async (prismaTx) => {
  //       // 4.1) If total changed: refund old, then charge new
  //       if (newTotal !== oldTotal) {
  //         // nhet lai tien cu ve vi
  //         const walletAfterRefund = await this.walletRepo.addBalanceToWalletWithType(
  //           { userId: existing.userId, type: walletType.SPARKLES, amount: oldTotal },
  //           prismaTx
  //         )
  //         if (!walletAfterRefund) throw new NotEnoughBalanceException()

  //         // Log refund transaction (INCREASE)
  //         await this.walletTransRepo.create(
  //           {
  //             createdById: userId,
  //             data: {
  //               walletId: walletAfterRefund.id,
  //               userId: existing.userId,
  //               purpose: walletPurposeType.SHOP,
  //               referenceId: id,
  //               amount: oldTotal,
  //               type: WalletTransactionType.INCREASE,
  //               source: WalletTransactionSourceType.SHOP_PURCHASE,
  //               description: `Refund previous total for purchase ${id}`
  //             }
  //           },
  //           prismaTx
  //         )

  //         //check coi du tien ko
  //         if ((walletAfterRefund as any).balance < newTotal) {
  //           // Optional: check current wallet if needed; here we guard via balance on returned entity
  //           throw new NotEnoughBalanceException()
  //         }

  //         // tru tien ra
  //         const walletAfterCharge =
  //           await this.walletRepo.minusBalanceToWalletWithTypeUserId(
  //             { userId: existing.userId, type: walletType.SPARKLES, amount: newTotal },
  //             prismaTx
  //           )
  //         if (!walletAfterCharge) throw new NotEnoughBalanceException()

  //         // Log charge transaction (DECREASE)
  //         await this.walletTransRepo.create(
  //           {
  //             createdById: userId,
  //             data: {
  //               walletId: walletAfterCharge.id,
  //               userId: existing.userId,
  //               purpose: walletPurposeType.SHOP,
  //               referenceId: id,
  //               amount: newTotal,
  //               type: WalletTransactionType.DECREASE,
  //               source: WalletTransactionSourceType.SHOP_PURCHASE,
  //               description: `Charge new total for purchase ${id}`
  //             }
  //           },
  //           prismaTx
  //         )
  //       }

  //       // 4.2) Update purchase record
  //       const updated = await this.gachaPurchaseRepo.update(
  //         {
  //           id,
  //           data: {
  //             ...data,
  //             gachaItemId: effectiveGachaItemId,
  //             quantity: effectiveQuantity,
  //             totalPrice: newTotal
  //           } as any,
  //           updatedById: userId
  //         },
  //         prismaTx
  //       )
  //       return updated
  //     })

  //     return {
  //       statusCode: 200,
  //       data: result,
  //       message: this.i18nService.translate(GachaPurchaseMessage.UPDATE_SUCCESS, lang)
  //     }
  //   } catch (error) {
  //     if (isNotFoundPrismaError(error)) {
  //       throw new GachaPurchaseNotFoundException()
  //     }

  //     if (isForeignKeyConstraintPrismaError(error)) {
  //       throw new NotFoundRecordException()
  //     }
  //     throw error
  //   }
  // }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existGachaPurchase = await this.gachaPurchaseRepo.findById(id)
      if (!existGachaPurchase) throw new GachaPurchaseNotFoundException()

      await this.gachaPurchaseRepo.withTransaction(async (prismaTx) => {
        // 1) Refund full amount to wallet
        const walletAfterRefund = await this.walletRepo.addBalanceToWalletWithType(
          {
            userId: existGachaPurchase.userId,
            type: walletType.SPARKLES,
            amount: existGachaPurchase.totalPrice
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
              userId: existGachaPurchase.userId,
              purpose: walletPurposeType.SHOP,
              referenceId: id,
              amount: existGachaPurchase.totalPrice,
              type: WalletTransactionType.INCREASE,
              source: WalletTransactionSourceType.SHOP_PURCHASE,
              description: `Refund on delete purchase ${id}`
            }
          },
          prismaTx
        )

        // 3) Soft delete purchase
        await this.gachaPurchaseRepo.delete(id, false, prismaTx)
      })

      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(GachaPurchaseMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new GachaPurchaseNotFoundException()
      }
      throw error
    }
  }

  async getByUser(userId: number, lang: string = 'vi') {
    const data = await this.gachaPurchaseRepo.findByUserId(userId)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(GachaPurchaseMessage.GET_LIST_SUCCESS, lang)
    }
  }

  rollGacha(
    pool: {
      id: number
      rate: number
      starType: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE'
    }[],
    pityCount: number, // số roll chưa ra 5★
    pityLimit: number = 90
  ) {
    let currentPity = pityCount

    const getRandomItem = () => {
      const totalRate = pool.reduce((sum, i) => sum + i.rate, 0)
      const rand = Math.random() * totalRate
      let cumulative = 0
      for (const item of pool) {
        cumulative += item.rate
        if (rand < cumulative) return item
      }
      return pool[pool.length - 1]
    }

    let selected

    // 🧭 Nếu đạt pity => đảm bảo 5★
    if (currentPity + 1 >= pityLimit) {
      const fiveStarPool = pool.filter((p) => p.starType === 'FIVE')
      selected = fiveStarPool[Math.floor(Math.random() * fiveStarPool.length)]
      currentPity = 0
    } else {
      selected = getRandomItem()
      currentPity = selected.starType === 'FIVE' ? 0 : currentPity + 1
    }

    return { result: selected, pityCount: currentPity }
  }
}
