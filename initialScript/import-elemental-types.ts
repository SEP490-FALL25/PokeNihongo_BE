import { PrismaService } from 'src/shared/services/prisma.service'

const prisma = new PrismaService()

const elementalTypes = [
  {
    type_name: 'Normal',
    display_name: { en: 'Normal', vi: 'Bình thường', ja: 'ノーマル' },
    color_hex: '#A8A77A'
  },
  {
    type_name: 'Fire',
    display_name: { en: 'Fire', vi: 'Lửa', ja: 'ほのお' },
    color_hex: '#EE8130'
  },
  {
    type_name: 'Water',
    display_name: { en: 'Water', vi: 'Nước', ja: 'みず' },
    color_hex: '#6390F0'
  },
  {
    type_name: 'Electric',
    display_name: { en: 'Electric', vi: 'Điện', ja: 'でんき' },
    color_hex: '#F7D02C'
  },
  {
    type_name: 'Grass',
    display_name: { en: 'Grass', vi: 'Cỏ', ja: 'くさ' },
    color_hex: '#7AC74C'
  },
  {
    type_name: 'Ice',
    display_name: { en: 'Ice', vi: 'Băng', ja: 'こおり' },
    color_hex: '#96D9D6'
  },
  {
    type_name: 'Fighting',
    display_name: { en: 'Fighting', vi: 'Đánh nhau', ja: 'かくとう' },
    color_hex: '#C22E28'
  },
  {
    type_name: 'Poison',
    display_name: { en: 'Poison', vi: 'Độc', ja: 'どく' },
    color_hex: '#A33EA1'
  },
  {
    type_name: 'Ground',
    display_name: { en: 'Ground', vi: 'Đất', ja: 'じめん' },
    color_hex: '#E2BF65'
  },
  {
    type_name: 'Flying',
    display_name: { en: 'Flying', vi: 'Bay', ja: 'ひこう' },
    color_hex: '#A98FF3'
  },
  {
    type_name: 'Psychic',
    display_name: { en: 'Psychic', vi: 'Tâm linh', ja: 'エスパー' },
    color_hex: '#F95587'
  },
  {
    type_name: 'Bug',
    display_name: { en: 'Bug', vi: 'Côn trùng', ja: 'むし' },
    color_hex: '#A6B91A'
  },
  {
    type_name: 'Rock',
    display_name: { en: 'Rock', vi: 'Đá', ja: 'いわ' },
    color_hex: '#B6A136'
  },
  {
    type_name: 'Ghost',
    display_name: { en: 'Ghost', vi: 'Ma', ja: 'ゴースト' },
    color_hex: '#735797'
  },
  {
    type_name: 'Dragon',
    display_name: { en: 'Dragon', vi: 'Rồng', ja: 'ドラゴン' },
    color_hex: '#6F35FC'
  },
  {
    type_name: 'Dark',
    display_name: { en: 'Dark', vi: 'Bóng tối', ja: 'あく' },
    color_hex: '#705746'
  },
  {
    type_name: 'Steel',
    display_name: { en: 'Steel', vi: 'Thép', ja: 'はがね' },
    color_hex: '#B7B7CE'
  },
  {
    type_name: 'Fairy',
    display_name: { en: 'Fairy', vi: 'Tiên', ja: 'フェアリー' },
    color_hex: '#D685AD'
  }
]

const main = async () => {
  console.log('🔥 Starting elemental types import...')

  // Kiểm tra xem đã có elemental types nào chưa
  const existingTypesCount = await prisma.elementalType.count()

  if (existingTypesCount > 0) {
    console.log(`⚠️  Found ${existingTypesCount} existing elemental types.`)

    // Kiểm tra từng type một để xem type nào chưa tồn tại
    const missingTypes: typeof elementalTypes = []
    for (const elementalType of elementalTypes) {
      const existing = await prisma.elementalType.findFirst({
        where: {
          type_name: elementalType.type_name,
          deletedAt: null
        }
      })

      if (!existing) {
        missingTypes.push(elementalType)
      }
    }

    if (missingTypes.length === 0) {
      console.log('✅ All elemental types already exist!')
      return { createdCount: 0, skippedCount: elementalTypes.length }
    }

    console.log(
      `📋 Found ${missingTypes.length} missing types: ${missingTypes.map((t) => t.type_name).join(', ')}`
    )

    // Import chỉ những types còn thiếu
    let createdCount = 0
    for (const elementalType of missingTypes) {
      try {
        await prisma.elementalType.create({
          data: elementalType
        })
        console.log(`✅ Created elemental type: ${elementalType.type_name}`)
        createdCount++
      } catch (error) {
        console.error(`❌ Failed to create ${elementalType.type_name}:`, error.message)
      }
    }

    return {
      createdCount,
      skippedCount: elementalTypes.length - missingTypes.length
    }
  }

  // Import tất cả nếu chưa có gì
  try {
    const result = await prisma.elementalType.createMany({
      data: elementalTypes,
      skipDuplicates: true
    })

    console.log(`✅ Successfully imported ${result.count} elemental types!`)

    // Log ra từng type đã tạo
    for (const elementalType of elementalTypes) {
      console.log(
        `   📦 ${elementalType.type_name} (${elementalType.display_name.vi}) - ${elementalType.color_hex}`
      )
    }

    return { createdCount: result.count, skippedCount: 0 }
  } catch (error) {
    console.error('❌ Failed to import elemental types:', error)
    throw error
  }
}

const importElementalTypes = async () => {
  try {
    await prisma.$connect()
    console.log('🔌 Connected to database')

    const result = await main()

    console.log('\n📊 Import Summary:')
    console.log(`   ✅ Created: ${result.createdCount} types`)
    console.log(`   ⏭️  Skipped: ${result.skippedCount} types`)
    console.log('\n🎉 Elemental types import completed successfully!')
  } catch (error) {
    console.error('💥 Import failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    console.log('🔌 Disconnected from database')
  }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  importElementalTypes()
}

export { importElementalTypes }
