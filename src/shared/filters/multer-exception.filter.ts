import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class MulterExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MulterExceptionFilter.name)

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    // Handle multer errors
    if (exception.code) {
      let message = 'Lỗi upload file'
      let statusCode = 400

      switch (exception.code) {
        case 'LIMIT_FILE_SIZE':
          message = 'Kích thước file vượt quá giới hạn cho phép'
          break
        case 'LIMIT_FILE_COUNT':
          message = 'Số lượng file vượt quá giới hạn cho phép'
          break
        case 'LIMIT_UNEXPECTED_FILE':
          message = 'Field name không đúng hoặc không được phép'
          break
        case 'LIMIT_PART_COUNT':
          message = 'Quá nhiều parts trong request'
          break
        case 'LIMIT_FIELD_KEY':
          message = 'Field name quá dài'
          break
        case 'LIMIT_FIELD_VALUE':
          message = 'Field value quá dài'
          break
        case 'LIMIT_FIELD_COUNT':
          message = 'Quá nhiều fields'
          break
        default:
          message = exception.message || 'Lỗi upload file không xác định'
      }

      this.logger.error(`Multer error: ${exception.code} - ${exception.message}`)

      return response.status(statusCode).json({
        statusCode,
        message,
        error: 'Bad Request',
        timestamp: new Date().toISOString()
      })
    }

    // Handle file filter errors (from multer config)
    if (exception.message && typeof exception.message === 'string') {
      const message = exception.message
      this.logger.error(`File filter error: ${message}`)

      return response.status(400).json({
        statusCode: 400,
        message,
        error: 'Bad Request',
        timestamp: new Date().toISOString()
      })
    }

    // If it's not a multer error, let other filters handle it
    throw exception
  }
}
