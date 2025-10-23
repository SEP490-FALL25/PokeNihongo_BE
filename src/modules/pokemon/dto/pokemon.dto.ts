import { RarityPokemon, RarityPokemonType } from '@/common/constants/pokemon.constant'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class PokemonDto {
  @ApiProperty({ description: 'ID của Pokémon' })
  id: number

  @ApiProperty({ description: 'Số Pokedex', minimum: 1 })
  pokedex_number: number

  @ApiProperty({ description: 'Tên tiếng Nhật' })
  nameJp: string

  @ApiProperty({
    description: 'Tên dịch sang các ngôn ngữ khác',
    type: Object,
    example: { en: 'Bulbasaur', ja: 'フシギダネ', vi: 'Fushigidane' }
  })
  nameTranslations: { en: string; ja: string; vi: string }

  @ApiPropertyOptional({ description: 'Mô tả', nullable: true })
  description?: string | null

  @ApiPropertyOptional({ description: 'Level yêu cầu', minimum: 1, nullable: true })
  conditionLevel?: number | null

  @ApiPropertyOptional({
    description: 'ID các Pokémon kế tiếp',
    type: [Number],
    default: []
  })
  nextPokemonsId?: number[]

  @ApiPropertyOptional({ description: 'Đã bắt đầu hay chưa', default: false })
  isStarted?: boolean

  @ApiPropertyOptional({ description: 'URL hình ảnh', nullable: true })
  imageUrl?: string | null

  @ApiPropertyOptional({
    description: 'Độ hiếm',
    enum: RarityPokemon,
    default: RarityPokemon.COMMON
  })
  rarity?: RarityPokemonType

  // Audit fields
  @ApiPropertyOptional({ description: 'ID người tạo', nullable: true })
  createdById?: number | null

  @ApiPropertyOptional({ description: 'ID người cập nhật', nullable: true })
  updatedById?: number | null

  @ApiPropertyOptional({ description: 'ID người xóa', nullable: true })
  deletedById?: number | null

  @ApiProperty({ description: 'Ngày tạo' })
  createdAt: Date

  @ApiProperty({ description: 'Ngày cập nhật' })
  updatedAt: Date

  @ApiPropertyOptional({ description: 'Ngày xóa', nullable: true })
  deletedAt?: Date | null
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại', default: 1, minimum: 1 })
  currentPage?: number

  @ApiPropertyOptional({ description: 'Số bản ghi trên trang', default: 15, minimum: 1 })
  pageSize?: number

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm' })
  qs?: string
}
