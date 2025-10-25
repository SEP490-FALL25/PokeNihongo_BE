import { I18nService } from '@/i18n/i18n.service'
import { RewardMessage } from '@/i18n/message-keys'
import { LanguageNotExistToTranslateException, NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { LanguagesRepository } from '../languages/languages.repo'
import { CreateTranslationBodyType } from '../translation/entities/translation.entities'
import { TranslationRepository } from '../translation/translation.repo'
import { RewardAlreadyExistsException } from './dto/reward.error'
import {
  CreateRewardBodyInputType,
  CreateRewardBodyType,
  UpdateRewardBodyInputType,
  UpdateRewardBodyType
} from './entities/reward.entity'
import { RewardRepo } from './reward.repo'

@Injectable()
export class RewardService {
  constructor(
    private rewardRepo: RewardRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepository,
    private readonly translationRepo: TranslationRepository
  ) { }

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.rewardRepo.list(pagination)
    return {
      data,
      message: this.i18nService.translate(RewardMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const reward = await this.rewardRepo.findById(id)
    if (!reward) {
      throw new NotFoundRecordException()
    }

    const langId = await this.languageRepo.getIdByCode(lang)
    if (!langId) {
      return {
        data: reward,
        message: this.i18nService.translate(RewardMessage.GET_SUCCESS, lang)
      }
    }

    const nameTranslation = await this.translationRepo.findByLangAndKey(
      langId,
      reward.nameKey
    )

    const resultRes = {
      ...reward,
      nameTranslation: nameTranslation?.value ?? null
    }

    return {
      statusCode: HttpStatus.OK,
      data: resultRes,
      message: this.i18nService.translate(RewardMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateRewardBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    let createdReward: any = null

    try {
      return await this.rewardRepo.withTransaction(async (prismaTx) => {
        const nameKey = `reward.name.${Date.now()}`

        // Convert data for create
        const dataCreate: CreateRewardBodyType = {
          nameKey,
          rewardType: data.rewardType,
          rewardItem: data.rewardItem,
          rewardTarget: data.rewardTarget
        }

        createdReward = await this.rewardRepo.create(
          {
            createdById,
            data: dataCreate
          },
          prismaTx
        )

        // Now we have id, create proper nameKey
        const fNameKey = `reward.name.${createdReward.id}`

        const nameList = data.nameTranslations.map((t) => t.key)

        // Get unique language codes
        const allLangCodes = Array.from(new Set(nameList))

        // Get languages corresponding to the keys
        const languages = await this.languageRepo.getWithListCode(allLangCodes)

        // Create map { code: id } for quick access
        const langMap = Object.fromEntries(languages.map((l) => [l.code, l.id]))

        // Check if any language is missing
        const missingLangs = allLangCodes.filter((code) => !langMap[code])
        if (missingLangs.length > 0) {
          throw new LanguageNotExistToTranslateException()
        }

        // Create translation records
        const translationRecords: CreateTranslationBodyType[] = []

        // nameTranslations → key = nameKey
        for (const item of data.nameTranslations) {
          translationRecords.push({
            languageId: langMap[item.key],
            key: fNameKey,
            value: item.value
          })
        }

        // Validate translations (check for duplicate names)
        await this.translationRepo.validateTranslationRecords(translationRecords)

        // Create or update translations with transaction
        const translationPromises = translationRecords.map((record) =>
          this.translationRepo.createOrUpdateWithTransaction(record, prismaTx)
        )
        await Promise.all(translationPromises)

        // Update reward with final nameKey
        const result = await this.rewardRepo.update(
          {
            id: createdReward.id,
            data: {
              nameKey: fNameKey
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.CREATED,
          data: result,
          message: this.i18nService.translate(RewardMessage.CREATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      // Rollback: Delete reward if created
      if (createdReward?.id) {
        try {
          await this.rewardRepo.delete(
            {
              id: createdReward.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) { }
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new RewardAlreadyExistsException()
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
      data: UpdateRewardBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingReward: any = null

    try {
      return await this.rewardRepo.withTransaction(async (prismaTx) => {
        // Get current record
        existingReward = await this.rewardRepo.findById(id)
        if (!existingReward) throw new NotFoundRecordException()

        // Prepare data for update
        const dataUpdate: Partial<UpdateRewardBodyType> = {}

        if (data.rewardType !== undefined) dataUpdate.rewardType = data.rewardType
        if (data.rewardItem !== undefined) dataUpdate.rewardItem = data.rewardItem
        if (data.rewardTarget !== undefined) dataUpdate.rewardTarget = data.rewardTarget

        // Handle translations if provided
        if (data.nameTranslations) {
          const nameList = data.nameTranslations.map((t) => t.key)
          const allLangCodes = Array.from(new Set(nameList))

          if (allLangCodes.length > 0) {
            // Get languages
            const languages = await this.languageRepo.getWithListCode(allLangCodes)
            const langMap = Object.fromEntries(languages.map((l) => [l.code, l.id]))

            // Check missing language
            const missingLangs = allLangCodes.filter((code) => !langMap[code])
            if (missingLangs.length > 0) throw new LanguageNotExistToTranslateException()

            // Create translation records
            const translationRecords: CreateTranslationBodyType[] = []

            // nameTranslations
            for (const t of data.nameTranslations) {
              translationRecords.push({
                languageId: langMap[t.key],
                key: existingReward.nameKey,
                value: t.value
              })
            }

            // Validate translation records
            await this.translationRepo.validateTranslationRecords(translationRecords)

            // Update translations with transaction
            const translationPromises = translationRecords.map((record) =>
              this.translationRepo.createOrUpdateWithTransaction(record, prismaTx)
            )
            await Promise.all(translationPromises)
          }
        }

        // Update Reward main record
        const updatedReward = await this.rewardRepo.update(
          {
            id,
            updatedById,
            data: dataUpdate
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.OK,
          data: updatedReward,
          message: this.i18nService.translate(RewardMessage.UPDATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new RewardAlreadyExistsException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.rewardRepo.delete({
        id,
        deletedById
      })
      return {
        data: null,
        message: this.i18nService.translate(RewardMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
