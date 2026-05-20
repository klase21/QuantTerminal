// ======================================================
// lib/news/translateNews.ts
// ======================================================

export type TranslateTarget =
  | "ko"
  | "en"
  | "zh"
  | "zh-CN"

export async function translateNews(
  text: string,
  targetLang: TranslateTarget = "ko"
): Promise<string> {
  try {
    if (!text) return ""

    const target =
      targetLang === "zh"
        ? "zh-CN"
        : targetLang

    const url =
      `https://translate.googleapis.com/translate_a/single` +
      `?client=gtx` +
      `&sl=auto` +
      `&tl=${target}` +
      `&dt=t` +
      `&q=${encodeURIComponent(text)}`

    const res = await fetch(url, {
      cache: "no-store",
    })

    if (!res.ok) {
      console.error(
        "GOOGLE TRANSLATE ERROR:",
        res.status
      )

      return text
    }

    const data = await res.json()

    const translated =
      data?.[0]
        ?.map((t: any) => t[0])
        ?.join("")

    return translated || text
  } catch (err) {
    console.error(
      "TRANSLATE FAILED:",
      err
    )

    return text
  }
}