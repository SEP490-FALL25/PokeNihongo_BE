export const RarityPokemon = {
  COMMON: 'COMMON',
  UNCOMMON: 'UNCOMMON',
  RARE: 'RARE',
  EPIC: 'EPIC',
  LEGENDARY: 'LEGENDARY'
} as const

export type RarityPokemonType = keyof typeof RarityPokemon
