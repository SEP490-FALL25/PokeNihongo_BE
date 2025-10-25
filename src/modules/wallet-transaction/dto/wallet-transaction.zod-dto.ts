import { createZodDto } from 'nestjs-zod'
import {
  CreateWalletTransactionBodySchema,
  CreateWalletTransactionResSchema,
  GetWalletTransactionDetailResSchema,
  GetWalletTransactionParamsSchema,
  UpdateWalletTransactionBodySchema,
  UpdateWalletTransactionResSchema
} from '../entities/wallet-transaction.entity'

export class CreatedWalletTransactionBodyDTO extends createZodDto(
  CreateWalletTransactionBodySchema
) {}

export class CreateWalletTransactionResDTO extends createZodDto(
  CreateWalletTransactionResSchema
) {}

export class UpdateWalletTransactionBodyDTO extends createZodDto(
  UpdateWalletTransactionBodySchema
) {}

export class UpdateWalletTransactionResDTO extends createZodDto(
  UpdateWalletTransactionResSchema
) {}

export class GetWalletTransactionParamsDTO extends createZodDto(
  GetWalletTransactionParamsSchema
) {}

export class GetWalletTransactionDetailResDTO extends createZodDto(
  GetWalletTransactionDetailResSchema
) {}
