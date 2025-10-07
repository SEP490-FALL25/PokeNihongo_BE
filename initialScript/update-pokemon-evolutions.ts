import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'

const API_BASE_URL = 'http://localhost:4000'
const POKEMON_API = `${API_BASE_URL}/pokemon`

interface EvolutionData {
  pokemonId: number
  conditionLevel: number
  nextPokemonsId: number[]
}

async function updatePokemonEvolution(evolutionData: EvolutionData): Promise<boolean> {
  try {
    const updateData = {
      conditionLevel: evolutionData.conditionLevel,
      nextPokemonsId: evolutionData.nextPokemonsId
    }

    const response = await axios.put(
      `${POKEMON_API}/${evolutionData.pokemonId}`,
      updateData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': 'vi' // Using Vietnamese as default
        }
      }
    )

    if (response.status === 200) {
      console.log(`✅ Updated Pokemon ID ${evolutionData.pokemonId} with evolution data`)
      return true
    } else {
      console.error(`❌ Failed to update Pokemon ID ${evolutionData.pokemonId}`)
      return false
    }
  } catch (error) {
    console.error(
      `❌ Error updating Pokemon ID ${evolutionData.pokemonId}:`,
      error.response?.data || error.message
    )
    return false
  }
}

async function updatePokemonEvolutions() {
  try {
    const evolutionsJsonPath = path.join(__dirname, 'data', 'evolutions.json')

    if (!fs.existsSync(evolutionsJsonPath)) {
      console.error(`❌ Evolution data file not found: ${evolutionsJsonPath}`)
      return
    }

    const evolutionsData: EvolutionData[] = JSON.parse(
      fs.readFileSync(evolutionsJsonPath, 'utf8')
    )

    console.log(`🚀 Starting update of ${evolutionsData.length} Pokemon evolutions...`)

    let successCount = 0
    let failCount = 0

    for (const evolution of evolutionsData) {
      console.log(`\n📦 Processing Pokemon ID ${evolution.pokemonId} evolution update...`)

      const updated = await updatePokemonEvolution(evolution)

      if (updated) {
        successCount++
      } else {
        failCount++
      }

      // Add small delay to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    console.log(`\n🎉 Evolution update completed!`)
    console.log(`✅ Successfully updated: ${successCount} Pokemon`)
    console.log(`❌ Failed to update: ${failCount} Pokemon`)
  } catch (error) {
    console.error('❌ Error during Pokemon evolution update:', error.message)
  }
}

// Run the update
if (require.main === module) {
  updatePokemonEvolutions()
    .then(() => {
      console.log('🏁 Pokemon evolution update script finished')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error)
      process.exit(1)
    })
}

export { updatePokemonEvolutions }
