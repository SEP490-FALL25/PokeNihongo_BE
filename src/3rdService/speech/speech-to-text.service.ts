import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SpeechClient } from '@google-cloud/speech'
import { createSpeechClient, SPEECH_CONFIG, validateAudioFormat, validateLanguageCode, validateEncoding, validateModel, validateSampleRate } from './config/speech.config'

export interface SpeechToTextResult {
    transcript: string
    confidence: number
    languageCode: string
}

export interface SpeechToTextOptions {
    languageCode?: string
    sampleRateHertz?: number
    encoding?: 'LINEAR16' | 'FLAC' | 'MULAW' | 'AMR' | 'AMR_WB' | 'OGG_OPUS' | 'SPEEX_WITH_HEADER_BYTE'
    enableAutomaticPunctuation?: boolean
    enableWordTimeOffsets?: boolean
    model?: 'default' | 'latest_long' | 'latest_short' | 'phone_call' | 'video' | 'command_and_search'
}

@Injectable()
export class SpeechToTextService {
    private readonly logger = new Logger(SpeechToTextService.name)
    private speechClient: SpeechClient

    constructor(private readonly configService: ConfigService) {
        try {
            this.speechClient = createSpeechClient(this.configService)
            this.logger.log('Google Cloud Speech-to-Text client initialized successfully')
        } catch (error) {
            this.logger.error('Failed to initialize Google Cloud Speech client:', error)
            throw error
        }
    }

    /**
     * Convert audio to text using Google Cloud Speech-to-Text
     */
    async convertAudioToText(
        audioBuffer: Buffer,
        options: SpeechToTextOptions = {}
    ): Promise<SpeechToTextResult> {
        try {
            const startTime = Date.now()

            // Validate inputs
            const encoding = options.encoding || SPEECH_CONFIG.DEFAULT_ENCODING
            const sampleRate = options.sampleRateHertz || SPEECH_CONFIG.DEFAULT_SAMPLE_RATE
            const languageCode = options.languageCode || SPEECH_CONFIG.DEFAULT_LANGUAGE_CODE
            const model = options.model || SPEECH_CONFIG.DEFAULT_MODEL

            if (!validateEncoding(encoding)) {
                throw new Error(SPEECH_CONFIG.ERROR_MESSAGES.UNSUPPORTED_ENCODING)
            }
            if (!validateSampleRate(sampleRate)) {
                throw new Error('Sample rate không được hỗ trợ')
            }
            if (!validateLanguageCode(languageCode)) {
                throw new Error(SPEECH_CONFIG.ERROR_MESSAGES.UNSUPPORTED_LANGUAGE)
            }
            if (!validateModel(model)) {
                throw new Error(SPEECH_CONFIG.ERROR_MESSAGES.UNSUPPORTED_MODEL)
            }

            // Default configuration
            const config = {
                encoding,
                sampleRateHertz: sampleRate,
                languageCode,
                enableAutomaticPunctuation: options.enableAutomaticPunctuation ?? SPEECH_CONFIG.DEFAULT_ENABLE_PUNCTUATION,
                enableWordTimeOffsets: options.enableWordTimeOffsets ?? SPEECH_CONFIG.DEFAULT_ENABLE_WORD_TIME_OFFSETS,
                model
            }

            const audio = {
                content: audioBuffer.toString('base64')
            }

            const request = {
                config,
                audio
            }

            this.logger.log(`Starting speech recognition with config: ${JSON.stringify(config)}`)

            const [response] = await this.speechClient.recognize(request)
            const results = response.results

            if (!results || results.length === 0) {
                throw new Error(SPEECH_CONFIG.ERROR_MESSAGES.NO_SPEECH_RESULTS)
            }

            const result = results[0]
            const alternative = result.alternatives?.[0]

            if (!alternative) {
                throw new Error(SPEECH_CONFIG.ERROR_MESSAGES.NO_SPEECH_RESULTS)
            }

            const processingTime = Date.now() - startTime
            this.logger.log(`Speech recognition completed in ${processingTime}ms`)

            return {
                transcript: alternative.transcript || '',
                confidence: alternative.confidence || 0,
                languageCode: config.languageCode
            }
        } catch (error) {
            this.logger.error('Speech-to-Text conversion failed:', error)
            throw new Error(`${SPEECH_CONFIG.ERROR_MESSAGES.SPEECH_RECOGNITION_FAILED}: ${error.message}`)
        }
    }

    /**
     * Convert audio to text with streaming (for real-time processing)
     */
    async convertAudioToTextStreaming(
        audioStream: NodeJS.ReadableStream,
        options: SpeechToTextOptions = {}
    ): Promise<SpeechToTextResult> {
        return new Promise((resolve, reject) => {
            try {
                const config = {
                    encoding: options.encoding || 'LINEAR16',
                    sampleRateHertz: options.sampleRateHertz || 16000,
                    languageCode: options.languageCode || 'ja-JP',
                    enableAutomaticPunctuation: options.enableAutomaticPunctuation ?? true,
                    model: options.model || 'default'
                }

                const recognizeStream = this.speechClient
                    .streamingRecognize({
                        config,
                        interimResults: false // Set to true for real-time results
                    })
                    .on('error', (error) => {
                        this.logger.error('Streaming recognition error:', error)
                        reject(error)
                    })
                    .on('data', (data) => {
                        const result = data.results?.[0]
                        const alternative = result?.alternatives?.[0]

                        if (alternative) {
                            resolve({
                                transcript: alternative.transcript || '',
                                confidence: alternative.confidence || 0,
                                languageCode: config.languageCode
                            })
                        }
                    })

                audioStream.pipe(recognizeStream)
            } catch (error) {
                this.logger.error('Streaming speech recognition failed:', error)
                reject(error)
            }
        })
    }

    /**
     * Get supported languages
     */
    async getSupportedLanguages(): Promise<string[]> {
        return SPEECH_CONFIG.SUPPORTED_LANGUAGES
    }

    /**
     * Validate audio format
     */
    validateAudioFormat(audioBuffer: Buffer, expectedEncoding: string): boolean {
        return validateAudioFormat(audioBuffer, expectedEncoding)
    }
}
