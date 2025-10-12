import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface PokemonRarityData {
  pokemonId: number
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
}

async function updatePokemonRarity() {
  try {
    console.log('🚀 Starting Pokemon rarity update process...')

    // Read rarity data from JSON file
    const rarityDataPath = path.join(__dirname, 'data', 'pokemon_rarity.json')

    if (!fs.existsSync(rarityDataPath)) {
      console.error('❌ pokemon_rarity.json file not found!')
      return
    }

    const rarityData: PokemonRarityData[] = JSON.parse(
      fs.readFileSync(rarityDataPath, 'utf-8')
    )

    console.log(`📊 Found ${rarityData.length} Pokemon rarity records`)

    // Process in batches to avoid overwhelming the database
    const batchSize = 50
    let updatedCount = 0
    let notFoundCount = 0

    for (let i = 0; i < rarityData.length; i += batchSize) {
      const batch = rarityData.slice(i, i + batchSize)

      console.log(
        `🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(rarityData.length / batchSize)}`
      )

      // Process each item in batch
      for (const item of batch) {
        try {
          // Check if Pokemon exists
          const existingPokemon = await prisma.pokemon.findFirst({
            where: {
              pokedex_number: item.pokemonId,
              deletedAt: null
            }
          })

          if (!existingPokemon) {
            console.log(`⚠️  Pokemon with pokedex_number ${item.pokemonId} not found`)
            notFoundCount++
            continue
          }
          console.log(`🔄 Updating Pokemon ${item.pokemonId} rarity to ${item.rarity}`)
          // Update Pokemon rarity
          await prisma.pokemon.update({
            where: {
              id: existingPokemon.id
            },
            data: {
              rarity: item.rarity
            }
          })

          updatedCount++

          if (updatedCount % 10 === 0) {
            console.log(`✅ Updated ${updatedCount} Pokemon rarities`)
          }
        } catch (error) {
          console.error(`❌ Error updating Pokemon ${item.pokemonId}:`, error)
        }
      }

      // Add small delay between batches to prevent overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log('\n📋 Update Summary:')
    console.log(`✅ Successfully updated: ${updatedCount} Pokemon`)
    console.log(`⚠️  Not found: ${notFoundCount} Pokemon`)
    console.log(`📊 Total processed: ${rarityData.length} records`)
  } catch (error) {
    console.error('❌ Error during Pokemon rarity update:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run only if called directly
if (require.main === module) {
  updatePokemonRarity()
    .then(() => {
      console.log('🎉 Pokemon rarity update completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Pokemon rarity update failed:', error)
      process.exit(1)
    })
}

export default updatePokemonRarity
