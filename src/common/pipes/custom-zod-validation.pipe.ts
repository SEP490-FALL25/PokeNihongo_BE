import { I18nService } from '@/i18n/i18n.service'
import { ValidationMessage } from '@/i18n/message-keys'
import { UnprocessableEntityException } from '@nestjs/common'
import { createZodValidationPipe } from 'nestjs-zod'
import { ZodError } from 'zod'

// Simple function to get language from request
function getLanguageFromRequest(): string {
  const request = (global as any).currentRequest
  let lang = 'vi'

  console.log('getLanguageFromRequest called')
  console.log('request:', request ? 'exists' : 'null')
  console.log('accept-language header:', request?.headers?.['accept-language'])

  if (request?.headers?.['accept-language']) {
    const acceptLanguage = request.headers['accept-language']
    const languages = acceptLanguage
      .split(',')
      .map((l: string) => {
        const [locale, q] = l.trim().split(';q=')
        return {
          locale: locale.split('-')[0],
          quality: q ? parseFloat(q) : 1.0
        }
      })
      .sort((a: any, b: any) => b.quality - a.quality)

    const supportedLanguages = ['vi', 'en', 'ja']
    for (const language of languages) {
      if (supportedLanguages.includes(language.locale)) {
        lang = language.locale
        break
      }
    }
  }

  console.log('Detected language:', lang)
  return lang
}

// Create validation pipe with i18n support
export function createI18nZodValidationPipe(i18nService: I18nService) {
  return createZodValidationPipe({
    createValidationException: (error: ZodError) => {
      const lang = getLanguageFromRequest()

      return new UnprocessableEntityException(
        error.errors.map((error) => {
          let message = error.message

          // Try to translate common validation messages
          if (error.path.includes('userId') && error.code === 'invalid_type') {
            message = i18nService.translate(ValidationMessage.INVALID_USER_ID, lang)
          } else if (error.code === 'invalid_type') {
            message = i18nService.translate(ValidationMessage.INVALID_FORMAT, lang)
          } else if (error.message.includes('Required')) {
            message = i18nService.translate(ValidationMessage.REQUIRED, lang)
          } else {
            message = i18nService.translate(ValidationMessage.INVALID_DATA, lang)
          }

          return {
            message: message,
            path: error.path.join('.')
          }
        })
      )
    }
  })
}

// Global variable to store I18nService instance
let globalI18nService: I18nService

export function setGlobalI18nService(service: I18nService) {
  globalI18nService = service
}

const CustomZodValidationPipe = createZodValidationPipe({
  // provide custom validation exception factory
  createValidationException: (error: ZodError) => {
    const lang = getLanguageFromRequest()

    return new UnprocessableEntityException(
      error.errors.map((error) => {
        let message = error.message

        // If we have global I18nService, try to translate
        if (globalI18nService) {
          // Check if error.message is already a message key (contains '.')
          if (error.message.includes('.')) {
            message = globalI18nService.translate(error.message, lang)
          } else {
            // Try to translate common validation messages based on error type
            if (error.path.includes('userId') && error.code === 'invalid_type') {
              message = globalI18nService.translate(
                ValidationMessage.INVALID_USER_ID,
                lang
              )
            } else if (error.code === 'invalid_type') {
              message = globalI18nService.translate(
                ValidationMessage.INVALID_FORMAT,
                lang
              )
            } else if (error.message.includes('Required')) {
              message = globalI18nService.translate(ValidationMessage.REQUIRED, lang)
            } else {
              message = globalI18nService.translate(ValidationMessage.INVALID_DATA, lang)
            }
          }
        }

        return {
          message: message,
          path: error.path.join('.')
        }
      })
    )
  }
})

export default CustomZodValidationPipe
