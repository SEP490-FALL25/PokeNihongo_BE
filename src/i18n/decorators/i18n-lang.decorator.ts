import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const I18nLang = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest()
    const acceptLanguage = request.headers['accept-language']

    if (!acceptLanguage) {
      return 'vi' // Default language
    }

    // Parse Accept-Language header
    // Format: "en-US,en;q=0.9,vi;q=0.8"
    const languages = acceptLanguage
      .split(',')
      .map((lang: string) => {
        const [locale, q] = lang.trim().split(';q=')
        return {
          locale: locale.split('-')[0], // Get main language code (en from en-US)
          quality: q ? parseFloat(q) : 1.0
        }
      })
      .sort((a: any, b: any) => b.quality - a.quality)

    // Find supported language
    const supportedLanguages = ['vi', 'en', 'ja']
    for (const lang of languages) {
      if (supportedLanguages.includes(lang.locale)) {
        return lang.locale
      }
    }

    return 'vi' // Default fallback
  }
)
