import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class GeminiConfigModelSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID của GeminiConfigModel' })
    id: number

    @ApiProperty({ example: 'Pro (VN Guardrails)', description: 'Tên cấu hình model' })
    name: string

    @ApiProperty({ example: 1, description: 'ID tham chiếu tới GeminiModel' })
    geminiModelId: number

    @ApiPropertyOptional({ example: 0.7, description: 'Nhiệt độ mẫu' })
    temperature?: number | null

    @ApiPropertyOptional({ example: 0.9 })
    topP?: number | null

    @ApiPropertyOptional({ example: 40 })
    topK?: number | null

    @ApiPropertyOptional({ example: 2048 })
    maxTokens?: number | null

    @ApiPropertyOptional({ example: false })
    jsonMode?: boolean | null

    @ApiPropertyOptional({ example: 'Bạn là trợ lý thân thiện.' })
    systemInstruction?: string | null

    @ApiPropertyOptional({ example: { HATE_SPEECH: 'BLOCK', HARASSMENT: 'BLOCK_NONE' }, description: 'Thiết lập an toàn' })
    safetySettings?: Record<string, unknown> | null

    @ApiPropertyOptional({ example: { responseMimeType: 'application/json' } })
    extraParams?: Record<string, unknown> | null

    @ApiPropertyOptional({ example: true })
    isEnabled?: boolean
}

export class CreateGeminiConfigModelSwaggerDTO {
    @ApiProperty({ example: 'Pro (VN Guardrails)', description: 'Tên cấu hình model' })
    name: string

    @ApiProperty({ example: 1, description: 'ID tham chiếu tới GeminiModel' })
    geminiModelId: number

    @ApiPropertyOptional({ example: 0.7 })
    temperature?: number | null

    @ApiPropertyOptional({ example: 0.9 })
    topP?: number | null

    @ApiPropertyOptional({ example: 40 })
    topK?: number | null

    @ApiPropertyOptional({ example: 2048 })
    maxTokens?: number | null

    @ApiPropertyOptional({ example: false })
    jsonMode?: boolean | null

    @ApiPropertyOptional({ example: 'Bạn là trợ lý thân thiện.' })
    systemInstruction?: string | null

    @ApiPropertyOptional({ example: { HATE_SPEECH: 'BLOCK', HARASSMENT: 'BLOCK_NONE' } })
    safetySettings?: Record<string, unknown> | null

    @ApiPropertyOptional({ example: { responseMimeType: 'application/json' } })
    extraParams?: Record<string, unknown> | null

    @ApiPropertyOptional({ example: true })
    isEnabled?: boolean
}

export class UpdateGeminiConfigModelSwaggerDTO {
    @ApiPropertyOptional({ example: 'Pro (VN Guardrails) v2' })
    name?: string

    @ApiPropertyOptional({ example: 2 })
    geminiModelId?: number

    @ApiPropertyOptional({ example: 0.6 })
    temperature?: number | null

    @ApiPropertyOptional({ example: 0.95 })
    topP?: number | null

    @ApiPropertyOptional({ example: 50 })
    topK?: number | null

    @ApiPropertyOptional({ example: 3072 })
    maxTokens?: number | null

    @ApiPropertyOptional({ example: true })
    jsonMode?: boolean | null

    @ApiPropertyOptional({ example: 'Bạn là trợ lý chính xác và ngắn gọn.' })
    systemInstruction?: string | null

    @ApiPropertyOptional({ example: { HATE_SPEECH: 'BLOCK_NONE' } })
    safetySettings?: Record<string, unknown> | null

    @ApiPropertyOptional({ example: { responseMimeType: 'text/plain' } })
    extraParams?: Record<string, unknown> | null

    @ApiPropertyOptional({ example: false })
    isEnabled?: boolean
}


