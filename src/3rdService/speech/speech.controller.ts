import { Controller, Post, UploadedFile, UseInterceptors, Body, Logger } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger'
import { SpeechToTextService, SpeechToTextOptions } from './speech-to-text.service'
import {
    SpeechToTextRequestDTO,
    SpeechToTextMultipartDTO,
    SpeechToTextApiResponseDTO,
    SupportedLanguagesApiResponseDTO
} from './dto/speech.dto'
import { SPEECH_CONFIG } from './config/speech.config'

@Controller('speech')
@ApiBearerAuth('access-token')
export class SpeechController {
    private readonly logger = new Logger(SpeechController.name)

    constructor(private readonly speechToTextService: SpeechToTextService) { }

    @Post('to-text')
    @UseInterceptors(FileInterceptor('audio'))
    @ApiOperation({ summary: 'Chuyển đổi âm thanh thành văn bản bằng Google Speech-to-Text' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: SpeechToTextMultipartDTO })
    @ApiResponse({
        status: 200,
        description: 'Chuyển đổi thành công',
        type: SpeechToTextApiResponseDTO
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu âm thanh không hợp lệ'
    })
    async convertToText(
        @UploadedFile() audioFile: Express.Multer.File,
        @Body() options: SpeechToTextRequestDTO
    ) {
        try {
            this.logger.log(`Processing audio file: ${audioFile.originalname}`)

            if (!audioFile) {
                throw new Error(SPEECH_CONFIG.ERROR_MESSAGES.MISSING_AUDIO_FILE)
            }

            // Validate audio format
            const encoding = options.encoding || SPEECH_CONFIG.DEFAULT_ENCODING
            const isValid = this.speechToTextService.validateAudioFormat(audioFile.buffer, encoding)

            if (!isValid) {
                throw new Error(SPEECH_CONFIG.ERROR_MESSAGES.INVALID_AUDIO_FORMAT)
            }

            // Convert audio to text
            const result = await this.speechToTextService.convertAudioToText(audioFile.buffer, {
                languageCode: options.languageCode,
                sampleRateHertz: options.sampleRateHertz,
                encoding: options.encoding,
                enableAutomaticPunctuation: options.enableAutomaticPunctuation,
                enableWordTimeOffsets: options.enableWordTimeOffsets,
                model: options.model
            })

            this.logger.log(`Speech-to-Text result: "${result.transcript}" (confidence: ${result.confidence})`)

            return {
                statusCode: 200,
                data: result,
                message: SPEECH_CONFIG.SUCCESS_MESSAGES.SPEECH_TO_TEXT_SUCCESS
            }
        } catch (error) {
            this.logger.error('Speech-to-Text conversion failed:', error)
            throw new Error(`Chuyển đổi âm thanh thất bại: ${error.message}`)
        }
    }

    @Post('supported-languages')
    @ApiOperation({ summary: 'Lấy danh sách ngôn ngữ được hỗ trợ' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách ngôn ngữ thành công',
        type: SupportedLanguagesApiResponseDTO
    })
    async getSupportedLanguages() {
        try {
            const languages = await this.speechToTextService.getSupportedLanguages()

            return {
                statusCode: 200,
                data: { languages },
                message: SPEECH_CONFIG.SUCCESS_MESSAGES.LANGUAGES_RETRIEVED_SUCCESS
            }
        } catch (error) {
            this.logger.error('Failed to get supported languages:', error)
            throw new Error('Không thể lấy danh sách ngôn ngữ')
        }
    }
}
