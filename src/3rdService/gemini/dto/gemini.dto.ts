import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class EvaluateSpeakingDto {
  @ApiProperty({
    example: 'こんにちは',
    description: 'Câu tiếng Nhật cần đánh giá phát âm'
  })
  @IsString()
  text: string

  @ApiProperty({
    example: 'https://example.com/audio/user-audio.mp3',
    description: 'URL audio file của user'
  })
  @IsString()
  audioUrl: string

  @ApiProperty({
    example: 'こんにちは',
    description: 'Transcription từ audio (nếu có)',
    required: false
  })
  @IsOptional()
  @IsString()
  transcription?: string
}

export class GetPersonalizedRecommendationsDto {
  @ApiProperty({
    example: 1,
    description: 'ID của user'
  })
  @IsNumber()
  userId: number

  @ApiProperty({
    example: 10,
    description: 'Số lượng gợi ý muốn nhận',
    required: false,
    default: 10
  })
  @IsOptional()
  @IsNumber()
  limit?: number
}
