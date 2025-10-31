import { I18nService } from '@/i18n/i18n.service'
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common'
import { Response } from 'express'

@Catch(HttpException)
export class I18nHttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly i18nService: I18nService) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest()
    const status = exception.getStatus()

    // Get language from Accept-Language header
    const acceptLanguage = request.headers['accept-language']
    let lang = 'vi' // default

    if (acceptLanguage) {
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

    // Get exception response
    const exceptionResponse = exception.getResponse()
    let message = exception.message
    let details = {}
    // Check if exception has errorKey for translation
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as any
      if (responseObj.errorKey) {
        message = this.i18nService.translate(responseObj.errorKey, lang)
      } else if (responseObj.message) {
        message = responseObj.message
      }
      if (responseObj.data) {
        details = responseObj.data

        message += `: ${responseObj.data.toString()}`
        // message += `: ${JSON.stringify(responseObj.data).toString()}`
      }
    }

    const errorResponse = {
      statusCode: status,
      message: message,
      error: HttpStatus[status]
    }

    response.status(status).json(errorResponse)
  }
}
