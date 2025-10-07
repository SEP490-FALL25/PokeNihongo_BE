import axios from 'axios'
import FormData from 'form-data'
import * as fs from 'fs'
import * as path from 'path'

const API_BASE_URL = 'http://localhost:4000'
const UPLOAD_API = `${API_BASE_URL}/upload/file`
const POKEMON_API = `${API_BASE_URL}/pokemon`

interface PokemonData {
  pokedex_number: number
  nameJp: string
  nameTranslations: {
    en: string
    ja: string
    vi: string
  }
  description: string
  isStarted: boolean
  imageUrl: string
  rarity: string
  typeIds: number[]
  nextPokemonsId: number[]
}

interface UploadResponse {
  statusCode: number
  message: string
  data: {
    url: string
    publicId: string
  }
}

async function uploadImage(imagePath: string): Promise<string> {
  try {
    if (!fs.existsSync(imagePath)) {
      console.error(`Image file not found: ${imagePath}`)
      return ''
    }

    const form = new FormData()
    form.append('folderName', 'pokemon')
    form.append('type', 'image')
    form.append('file', fs.createReadStream(imagePath))

    const response = await axios.post<UploadResponse>(UPLOAD_API, form, {
      headers: {
        ...form.getHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.data.statusCode === 201) {
      console.log(
        `✅ Uploaded image: ${path.basename(imagePath)} -> ${response.data.data.url}`
      )
      return response.data.data.url
    } else {
      console.error(`❌ Failed to upload image: ${imagePath}`)
      return ''
    }
  } catch (error) {
    console.error(`❌ Error uploading image ${imagePath}:`, error.message)
    return ''
  }
}

async function createPokemon(
  pokemonData: PokemonData,
  uploadedImageUrl: string | null
): Promise<boolean> {
  try {
    const createData: any = {
      pokedex_number: pokemonData.pokedex_number,
      nameJp: pokemonData.nameJp,
      nameTranslations: pokemonData.nameTranslations,
      description: pokemonData.description,
      isStarted: pokemonData.isStarted,
      rarity: pokemonData.rarity,
      typeIds: pokemonData.typeIds,
      // Don't include evolution data in initial import - will be added later
      nextPokemonsId: []
    }

    // Only include imageUrl if it's not null
    if (uploadedImageUrl) {
      createData.imageUrl = uploadedImageUrl
    }

    const response = await axios.post(POKEMON_API, createData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'vi' // Using Vietnamese as default
      }
    })

    if (response.status === 201) {
      console.log(
        `✅ Created Pokemon: ${pokemonData.nameJp} (${pokemonData.nameTranslations.en})`
      )
      return true
    } else {
      console.error(`❌ Failed to create Pokemon: ${pokemonData.nameJp}`)
      return false
    }
  } catch (error) {
    console.error(
      `❌ Error creating Pokemon ${pokemonData.nameJp}:`,
      error.response?.data || error.message
    )
    return false
  }
}

async function importPokemons() {
  try {
    const pokemonsJsonPath = path.join(__dirname, 'data', 'pokemons.json')

    if (!fs.existsSync(pokemonsJsonPath)) {
      console.error(`❌ Pokemon data file not found: ${pokemonsJsonPath}`)
      return
    }

    const pokemonsData: PokemonData[] = JSON.parse(
      fs.readFileSync(pokemonsJsonPath, 'utf8')
    )

    console.log(`🚀 Starting import of ${pokemonsData.length} Pokemon...`)

    let successCount = 0
    let failCount = 0

    for (const pokemon of pokemonsData) {
      console.log(
        `\n📦 Processing Pokemon ${pokemon.pokedex_number}: ${pokemon.nameJp}...`
      )

      // Upload image first
      let uploadedImageUrl: string | null = null
      if (fs.existsSync(pokemon.imageUrl)) {
        uploadedImageUrl = await uploadImage(pokemon.imageUrl)
        if (!uploadedImageUrl) {
          console.log(
            `⚠️ Image upload failed for ${pokemon.nameJp}, creating Pokemon without image`
          )
        }
      } else {
        console.log(
          `⚠️ Image file not found for ${pokemon.nameJp}: ${pokemon.imageUrl}, creating Pokemon without image`
        )
      }

      // Create Pokemon with uploaded image URL (or null if no image)
      const created = await createPokemon(pokemon, uploadedImageUrl)

      if (created) {
        successCount++
      } else {
        failCount++
      }

      // Add small delay to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    console.log(`\n🎉 Import completed!`)
    console.log(`✅ Successfully imported: ${successCount} Pokemon`)
    console.log(`❌ Failed to import: ${failCount} Pokemon`)
  } catch (error) {
    console.error('❌ Error during Pokemon import:', error.message)
  }
}

// Run the import
if (require.main === module) {
  importPokemons()
    .then(() => {
      console.log('🏁 Pokemon import script finished')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error)
      process.exit(1)
    })
}

export { importPokemons }
