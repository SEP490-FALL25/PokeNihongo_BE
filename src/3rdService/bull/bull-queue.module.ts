import { BullModule } from '@nestjs/bull'
import { DynamicModule, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RedisModule } from '../redis/redis.module'
import { BullQueueService } from './bull-queue.service'

@Module({})
export class BullQueueModule {
  static forRoot(): DynamicModule {
    return {
      module: BullQueueModule,
      imports: [RedisModule],
      providers: [BullQueueService],
      exports: [BullQueueService],
      global: true
    }
  }

  static registerQueue(
    queueName: string,
    options: any = {},
    useMatchRedis: boolean = false
  ): DynamicModule {
    return {
      module: BullQueueModule,
      global: true,
      imports: [
        RedisModule,
        BullModule.registerQueueAsync({
          name: queueName,
          imports: [RedisModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            let redisUri: string | undefined
            if (useMatchRedis) {
              redisUri =
                configService.get<string>('REDIS_MATCH_URI') ||
                configService.get<string>('REDIS_URI')
            } else {
              redisUri = configService.get<string>('REDIS_URI')
            }

            if (!redisUri) {
              throw new Error('REDIS_URI is not defined')
            }

            // --- PHẦN QUAN TRỌNG BẠN ĐANG THIẾU ---
            const url = new URL(redisUri)
            const isTls = url.protocol === 'rediss:' // Kiểm tra xem có dùng SSL không
            // ---------------------------------------

            return {
              redis: {
                host: url.hostname,
                port: parseInt(url.port),
                password: url.password,

                // Cấu hình mạng
                keepAlive: 10000, // Bạn đã có
                maxRetriesPerRequest: null, // Bạn đã có
                retryStrategy: (times) => Math.min(times * 50, 2000), // Bạn đã có
                connectTimeout: 20000, // Bạn đã có

                // --- BẮT ĐẦU PHẦN CẦN BỔ SUNG ---
                // 1. Cấu hình TLS: AWS Redis public thường bắt buộc dùng cái này
                // Nếu không có, kết nối sẽ chập chờn hoặc bị từ chối ngầm
                tls: isTls ? { rejectUnauthorized: false } : undefined
                // --- KẾT THÚC PHẦN CẦN BỔ SUNG ---
              },

              // --- BẮT ĐẦU PHẦN CẦN BỔ SUNG ---
              // 2. Prefix: QUAN TRỌNG NHẤT để tránh xung đột Local/VPS
              // Nếu không có dòng này, máy Local của bạn sẽ cướp Job của VPS
              prefix: configService.get<string>('QUEUE_PREFIX') || 'bull_production',
              // --- KẾT THÚC PHẦN CẦN BỔ SUNG ---

              settings: {
                stalledInterval: 60000, // Tăng lên 60s cho mạng chậm
                maxStalledCount: 3,
                lockDuration: 60000, // Tăng lên 60s
                drainDelay: 20 // Tăng nhẹ lên 20ms để đỡ spam CPU
              },
              ...options
            }
          }
        })
      ],
      exports: [BullModule]
    }
  }
}
