import { ApiProperty } from '@nestjs/swagger'

export class SpeechToTextRequestDTO {
    @ApiProperty({
        type: 'string',
        description: 'Mã ngôn ngữ (mặc định: ja-JP)',
        example: 'ja-JP',
        required: false
    })
    languageCode?: string

    @ApiProperty({
        type: 'number',
        description: 'Tần số lấy mẫu (mặc định: 16000)',
        example: 16000,
        required: false
    })
    sampleRateHertz?: number

    @ApiProperty({
        type: 'string',
        enum: ['LINEAR16', 'FLAC', 'MULAW', 'AMR', 'AMR_WB', 'OGG_OPUS', 'SPEEX_WITH_HEADER_BYTE'],
        description: 'Định dạng mã hóa âm thanh (mặc định: LINEAR16)',
        example: 'LINEAR16',
        required: false
    })
    encoding?: 'LINEAR16' | 'FLAC' | 'MULAW' | 'AMR' | 'AMR_WB' | 'OGG_OPUS' | 'SPEEX_WITH_HEADER_BYTE'

    @ApiProperty({
        type: 'boolean',
        description: 'Bật dấu câu tự động (mặc định: true)',
        example: true,
        required: false
    })
    enableAutomaticPunctuation?: boolean

    @ApiProperty({
        type: 'boolean',
        description: 'Bật thời gian offset cho từng từ (mặc định: false)',
        example: false,
        required: false
    })
    enableWordTimeOffsets?: boolean

    @ApiProperty({
        type: 'string',
        enum: ['default', 'latest_long', 'latest_short', 'phone_call', 'video', 'command_and_search'],
        description: 'Mô hình nhận dạng giọng nói (mặc định: default)',
        example: 'default',
        required: false
    })
    model?: 'default' | 'latest_long' | 'latest_short' | 'phone_call' | 'video' | 'command_and_search'
}

export class SpeechToTextResponseDTO {
    @ApiProperty({
        example: 'こんにちは',
        description: 'Văn bản được chuyển đổi từ âm thanh'
    })
    transcript: string

    @ApiProperty({
        example: 0.95,
        description: 'Độ tin cậy của kết quả nhận dạng (0-1)',
        minimum: 0,
        maximum: 1
    })
    confidence: number

    @ApiProperty({
        example: 'ja-JP',
        description: 'Mã ngôn ngữ được sử dụng'
    })
    languageCode: string
}

export class SupportedLanguagesResponseDTO {
    @ApiProperty({
        type: [String],
        example: ['ja-JP', 'ja-JP-Wavenet-A', 'en-US', 'ko-KR'],
        description: 'Danh sách mã ngôn ngữ được hỗ trợ'
    })
    languages: string[]
}

export class SpeechToTextApiResponseDTO {
    @ApiProperty({
        example: 200,
        description: 'Mã trạng thái HTTP'
    })
    statusCode: number

    @ApiProperty({
        type: SpeechToTextResponseDTO,
        description: 'Dữ liệu kết quả nhận dạng giọng nói'
    })
    data: SpeechToTextResponseDTO

    @ApiProperty({
        example: 'Chuyển đổi âm thanh thành văn bản thành công',
        description: 'Thông báo kết quả'
    })
    message: string
}

export class SupportedLanguagesApiResponseDTO {
    @ApiProperty({
        example: 200,
        description: 'Mã trạng thái HTTP'
    })
    statusCode: number

    @ApiProperty({
        type: SupportedLanguagesResponseDTO,
        description: 'Dữ liệu danh sách ngôn ngữ'
    })
    data: SupportedLanguagesResponseDTO

    @ApiProperty({
        example: 'Lấy danh sách ngôn ngữ thành công',
        description: 'Thông báo kết quả'
    })
    message: string
}

export class SpeechToTextMultipartDTO {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'File âm thanh cần chuyển đổi (wav, flac, mp3, etc.)',
        required: true
    })
    audio: Express.Multer.File

    @ApiProperty({
        type: 'string',
        description: 'Mã ngôn ngữ (mặc định: ja-JP)',
        example: 'ja-JP',
        required: false
    })
    languageCode?: string

    @ApiProperty({
        type: 'number',
        description: 'Tần số lấy mẫu (mặc định: 16000)',
        example: 16000,
        required: false
    })
    sampleRateHertz?: number

    @ApiProperty({
        type: 'string',
        enum: ['LINEAR16', 'FLAC', 'MULAW', 'AMR', 'AMR_WB', 'OGG_OPUS', 'SPEEX_WITH_HEADER_BYTE'],
        description: 'Định dạng mã hóa âm thanh (mặc định: LINEAR16)',
        example: 'LINEAR16',
        required: false
    })
    encoding?: string

    @ApiProperty({
        type: 'boolean',
        description: 'Bật dấu câu tự động (mặc định: true)',
        example: true,
        required: false
    })
    enableAutomaticPunctuation?: boolean

    @ApiProperty({
        type: 'string',
        enum: ['default', 'latest_long', 'latest_short', 'phone_call', 'video', 'command_and_search'],
        description: 'Mô hình nhận dạng giọng nói (mặc định: default)',
        example: 'default',
        required: false
    })
    model?: string
}
