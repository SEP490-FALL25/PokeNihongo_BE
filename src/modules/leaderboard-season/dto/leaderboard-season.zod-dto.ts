import { createZodDto } from 'nestjs-zod'
import {
  CreateLeaderboardSeasonBodyInputSchema,
  CreateLeaderboardSeasonResSchema,
  GetLeaderboardSeasonDetailResSchema,
  GetLeaderboardSeasonDetailWithAllLangResSchema,
  GetLeaderboardSeasonParamsSchema,
  GetLeaderboardWithRewardSeasonDetailResSchema,
  UpdateLeaderboardSeasonBodyInputSchema,
  UpdateLeaderboardSeasonResSchema
} from '../entities/leaderboard-season.entity'

export class CreatedLeaderboardSeasonBodyInputDTO extends createZodDto(
  CreateLeaderboardSeasonBodyInputSchema
) {}

export class CreateLeaderboardSeasonResDTO extends createZodDto(
  CreateLeaderboardSeasonResSchema
) {}

export class UpdateLeaderboardSeasonBodyInputDTO extends createZodDto(
  UpdateLeaderboardSeasonBodyInputSchema
) {}

export class UpdateLeaderboardSeasonResDTO extends createZodDto(
  UpdateLeaderboardSeasonResSchema
) {}

export class GetLeaderboardSeasonParamsDTO extends createZodDto(
  GetLeaderboardSeasonParamsSchema
) {}

export class GetLeaderboardSeasonDetailResDTO extends createZodDto(
  GetLeaderboardSeasonDetailResSchema
) {}

export class GetLeaderboardSeasonDetailWithAllLangResDTO extends createZodDto(
  GetLeaderboardSeasonDetailWithAllLangResSchema
) {}

export class GetLeaderboardWithRewardSeasonDetailResDTO extends createZodDto(
  GetLeaderboardWithRewardSeasonDetailResSchema
) {}
