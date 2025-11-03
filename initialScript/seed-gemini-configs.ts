import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/shared/services/prisma.service'
import { GEMINI_DEFAULT_CONFIGS } from '../src/3rdService/gemini/config/gemini-default-configs'
import { GeminiConfigType } from '@prisma/client'

async function main() {
    console.log('🌱 Bắt đầu seed Gemini configs...')

    const app = await NestFactory.createApplicationContext(AppModule)
    const prismaService = app.get(PrismaService)

    try {
        for (const config of GEMINI_DEFAULT_CONFIGS) {
            try {
                // Kiểm tra xem config đã tồn tại chưa (configType là unique)
                const existing = await prismaService.geminiConfig.findUnique({
                    where: {
                        configType: config.configType as GeminiConfigType
                    }
                })

                if (existing && !existing.deletedAt) {
                    console.log(`⚠️  Config ${config.configType} đã tồn tại, đang cập nhật...`)
                    await prismaService.geminiConfig.update({
                        where: {
                            configType: config.configType as GeminiConfigType
                        },
                        data: {
                            modelName: config.modelName,
                            prompt: config.prompt,
                            isActive: config.isActive
                        }
                    })
                    console.log(`✅ Đã cập nhật config: ${config.configType} với model: ${config.modelName}`)
                } else if (existing && existing.deletedAt) {
                    // Nếu đã bị xóa (soft delete), restore và update
                    console.log(`⚠️  Config ${config.configType} đã bị xóa, đang restore và cập nhật...`)
                    await prismaService.geminiConfig.update({
                        where: {
                            configType: config.configType as GeminiConfigType
                        },
                        data: {
                            modelName: config.modelName,
                            prompt: config.prompt,
                            isActive: config.isActive,
                            deletedAt: null,
                            deletedById: null
                        }
                    })
                    console.log(`✅ Đã restore và cập nhật config: ${config.configType}`)
                } else {
                    await prismaService.geminiConfig.create({
                        data: {
                            configType: config.configType as GeminiConfigType,
                            modelName: config.modelName,
                            prompt: config.prompt,
                            isActive: config.isActive
                        }
                    })
                    console.log(`✅ Đã tạo config: ${config.configType} với model: ${config.modelName}`)
                }
            } catch (error) {
                console.error(`❌ Lỗi khi tạo config ${config.configType}:`, error)
            }
        }

        console.log('\n🎉 Hoàn thành seed Gemini configs!')

        // Hiển thị tóm tắt
        const allConfigs = await prismaService.geminiConfig.findMany({
            where: {
                deletedAt: null
            },
            select: {
                configType: true,
                modelName: true,
                isActive: true
            }
        })

        console.log('\n📊 Tóm tắt các config trong database:')
        allConfigs.forEach(config => {
            console.log(`  - ${config.configType}: ${config.modelName} (${config.isActive ? 'Active' : 'Inactive'})`)
        })

    } catch (error) {
        console.error('❌ Lỗi khi chạy seed Gemini configs:', error)
        throw error
    } finally {
        await app.close()
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})

