import { PrismaService } from 'src/shared/services/prisma.service'

const prisma = new PrismaService()

const typeChart: Record<string, Record<string, number>> = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: {
    Fire: 0.5,
    Water: 0.5,
    Grass: 2,
    Ice: 2,
    Bug: 2,
    Rock: 0.5,
    Dragon: 0.5,
    Steel: 2
  },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass: {
    Fire: 0.5,
    Water: 2,
    Grass: 0.5,
    Poison: 0.5,
    Ground: 2,
    Flying: 0.5,
    Bug: 0.5,
    Rock: 2,
    Dragon: 0.5,
    Steel: 0.5
  },
  Ice: {
    Fire: 0.5,
    Water: 0.5,
    Grass: 2,
    Ice: 0.5,
    Ground: 2,
    Flying: 2,
    Dragon: 2,
    Steel: 0.5
  },
  Fighting: {
    Normal: 2,
    Ice: 2,
    Rock: 2,
    Dark: 2,
    Steel: 2,
    Poison: 0.5,
    Flying: 0.5,
    Psychic: 0.5,
    Bug: 0.5,
    Fairy: 0.5,
    Ghost: 0
  },
  Poison: {
    Grass: 2,
    Poison: 0.5,
    Ground: 0.5,
    Rock: 0.5,
    Ghost: 0.5,
    Steel: 0,
    Fairy: 2
  },
  Ground: {
    Fire: 2,
    Electric: 2,
    Grass: 0.5,
    Poison: 2,
    Flying: 0,
    Bug: 0.5,
    Rock: 2,
    Steel: 2
  },
  Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Steel: 0.5, Dark: 0 },
  Bug: {
    Fire: 0.5,
    Grass: 2,
    Fighting: 0.5,
    Poison: 0.5,
    Flying: 0.5,
    Psychic: 2,
    Ghost: 0.5,
    Dark: 2,
    Steel: 0.5,
    Fairy: 0.5
  },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
  Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 }
}

async function importTypeEffectiveness() {
  try {
    console.log('🚀 Bắt đầu import Type Effectiveness data...')

    // Lấy tất cả elemental types từ database
    const elementalTypes = await prisma.elementalType.findMany({
      where: { deletedAt: null },
      select: { id: true, type_name: true }
    })

    console.log(`📊 Tìm thấy ${elementalTypes.length} elemental types`)

    // Tạo map để dễ lookup
    const typeMap = new Map<string, number>()
    elementalTypes.forEach((type) => {
      typeMap.set(type.type_name, type.id)
    })

    // Validate tất cả types trong typeChart có tồn tại trong database
    const allTypesInChart = new Set([
      ...Object.keys(typeChart),
      ...Object.values(typeChart).flatMap((defenders) => Object.keys(defenders))
    ])

    const missingTypes = Array.from(allTypesInChart).filter(
      (typeName) => !typeMap.has(typeName)
    )
    if (missingTypes.length > 0) {
      console.error(
        `❌ Các types sau không tồn tại trong database: ${missingTypes.join(', ')}`
      )
      return
    }

    // Xóa dữ liệu cũ (nếu có)
    const deleteResult = await prisma.typeEffectiveness.deleteMany({})
    console.log(`🗑️ Đã xóa ${deleteResult.count} records cũ`)

    // Tạo type effectiveness data
    const typeEffectivenessData: Array<{
      attackerId: number
      defenderId: number
      multiplier: number
    }> = []

    // Duyệt qua typeChart để tạo data
    for (const [attackerName, defenderEffects] of Object.entries(typeChart)) {
      const attackerId = typeMap.get(attackerName)
      if (!attackerId) continue

      for (const [defenderName, multiplier] of Object.entries(defenderEffects)) {
        const defenderId = typeMap.get(defenderName)
        if (!defenderId) continue

        typeEffectivenessData.push({
          attackerId,
          defenderId,
          multiplier
        })
      }
    }

    console.log(`📝 Tạo ${typeEffectivenessData.length} type effectiveness records`)

    // Batch insert để tối ưu performance
    const batchSize = 50
    let insertedCount = 0

    for (let i = 0; i < typeEffectivenessData.length; i += batchSize) {
      const batch = typeEffectivenessData.slice(i, i + batchSize)

      await prisma.typeEffectiveness.createMany({
        data: batch,
        skipDuplicates: true
      })

      insertedCount += batch.length
      console.log(`✅ Đã insert ${insertedCount}/${typeEffectivenessData.length} records`)
    }

    // Kiểm tra kết quả
    const finalCount = await prisma.typeEffectiveness.count()
    console.log(
      `🎉 Import thành công! Tổng cộng ${finalCount} type effectiveness records`
    )

    // Hiển thị một số thống kê
    console.log('\n📊 Thống kê:')

    // Đếm số effectiveness records theo từng attacker type
    for (const [attackerName] of Object.entries(typeChart)) {
      const attackerId = typeMap.get(attackerName)
      if (!attackerId) continue

      const count = await prisma.typeEffectiveness.count({
        where: { attackerId }
      })
      console.log(`  ${attackerName}: ${count} effectiveness records`)
    }

    // Kiểm tra một số examples
    console.log('\n🔍 Một số ví dụ:')
    const examples = [
      { attacker: 'Fire', defender: 'Grass', expected: 2 },
      { attacker: 'Water', defender: 'Fire', expected: 2 },
      { attacker: 'Electric', defender: 'Ground', expected: 0 },
      { attacker: 'Fighting', defender: 'Ghost', expected: 0 }
    ]

    for (const example of examples) {
      const attackerId = typeMap.get(example.attacker)
      const defenderId = typeMap.get(example.defender)

      if (attackerId && defenderId) {
        const record = await prisma.typeEffectiveness.findFirst({
          where: { attackerId, defenderId }
        })

        const multiplier = record?.multiplier ?? 1
        const status = multiplier === example.expected ? '✅' : '❌'
        console.log(
          `  ${status} ${example.attacker} vs ${example.defender}: ${multiplier}x (expected: ${example.expected}x)`
        )
      }
    }
  } catch (error) {
    console.error('❌ Lỗi khi import type effectiveness:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Chạy script
importTypeEffectiveness()
