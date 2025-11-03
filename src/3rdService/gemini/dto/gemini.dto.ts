import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString, IsEnum } from 'class-validator'
import { GeminiModel } from './gemini.enums'

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

export class AIKaiwaDto {
  @ApiProperty({
    example: 'こんにちは、元気ですか？',
    description: 'Câu hỏi hoặc tin nhắn từ user (tiếng Nhật). Nếu có audioUrl thì message này sẽ được dùng làm reference text để đánh giá phát âm.',
    required: false
  })
  @IsOptional()
  @IsString()
  message?: string

  @ApiProperty({
    example: 'https://example.com/audio/user-audio.mp3',
    description: 'URL audio file của user (nếu có, sẽ convert sang text bằng Speech-to-Text)',
    required: false
  })
  @IsOptional()
  @IsString()
  audioUrl?: string

  @ApiProperty({
    example: 'conv_123456789',
    description: 'ID của conversation (nếu là conversation mới thì không cần, sẽ tự generate)',
    required: false
  })
  @IsOptional()
  @IsString()
  conversationId?: string

  @ApiProperty({
    example: true,
    description: 'Có muốn nhận audio response không (mặc định: true)',
    required: false,
    default: true
  })
  @IsOptional()
  includeAudio?: boolean

  @ApiProperty({
    example: false,
    description: 'Có muốn đánh giá phát âm không (chỉ khi có audioUrl và message)',
    required: false,
    default: false
  })
  @IsOptional()
  assessPronunciation?: boolean
}

export class ChatWithGeminiDto {
  @ApiProperty({
    example: 'Xin chào, bạn có thể giúp tôi học tiếng Nhật không?',
    description: 'Tin nhắn từ user'
  })
  @IsString()
  message: string

  @ApiProperty({
    example: 'conv_123456789',
    description: 'ID của conversation (nếu là conversation mới thì không cần, sẽ tự generate)',
    required: false
  })
  @IsOptional()
  @IsString()
  conversationId?: string

  @ApiProperty({
    example: GeminiModel.GEMINI_2_5_PRO,
    enum: GeminiModel,
    description: 'Tên model Gemini muốn sử dụng (mặc định: gemini-2.5-pro)',
    required: false
  })
  @IsOptional()
  @IsEnum(GeminiModel)
  modelName?: GeminiModel | string

  @ApiProperty({
    example: false,
    description: 'Có lưu lịch sử conversation vào DB không (mặc định: true)',
    required: false,
    default: true
  })
  @IsOptional()
  saveHistory?: boolean
}