export function pickNameTranslation(
  nameTranslations: any,
  langId?: number,
  nameKey?: string
): string | undefined {
  if (!langId) return undefined

  if (!Array.isArray(nameTranslations) || nameTranslations.length === 0) {
    return nameKey
  }

  const first = nameTranslations[0]
  // If translation entries include languageId, find exact match
  if (first && Object.prototype.hasOwnProperty.call(first, 'languageId')) {
    const matched = nameTranslations.find((t: any) => t.languageId === langId)
    return matched ? matched.value : nameKey
  }

  // Otherwise, likely the repo returned only { value } entries - use the first
  return first?.value ?? nameKey
}

export default pickNameTranslation
