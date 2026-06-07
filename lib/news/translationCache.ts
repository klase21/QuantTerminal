// ======================================================
// TRANSLATION CACHE
// ======================================================

const cache = new Map<string, string>()

export function getCachedTranslation(
  key: string
) {

  return cache.get(key)

}

export function setCachedTranslation(

  key: string,

  value: string

) {

  cache.set(key, value)

}