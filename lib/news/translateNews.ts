// ======================================================
// lib/news/translateNews.ts
// ======================================================

export async function translateNews(

  text: string,

  lang:
    | "en"
    | "kr"
    | "cn"

): Promise<string> {

  try {

    // ======================================================
    // EMPTY
    // ======================================================

    if (!text) {

      return ""

    }

    // ======================================================
    // TARGET
    // ======================================================

    const target =

      lang === "kr"
        ? "ko"

      : lang === "cn"
        ? "zh-CN"

      : "en"

    // ======================================================
    // SKIP ENGLISH
    // ======================================================

    if (target === "en") {

      return text

    }

    // ======================================================
    // GOOGLE UNOFFICIAL
    // ======================================================

    const url =

      `https://translate.googleapis.com/translate_a/single` +

      `?client=gtx` +

      `&sl=auto` +

      `&tl=${target}` +

      `&dt=t` +

      `&q=${encodeURIComponent(text)}`

    const res =
      await fetch(url, {
        cache: "no-store",
      })

    if (!res.ok) {

      console.error(
        "GOOGLE TRANSLATE ERROR:",
        res.status
      )

      return text

    }

    const data =
      await res.json()

    // ======================================================
    // PARSE
    // ======================================================

    const translated =
      data?.[0]
        ?.map((t: any) => t[0])
        ?.join("")

    return (
      translated ||
      text
    )

  } catch (err) {

    console.error(
      "TRANSLATE FAILED:",
      err
    )

    return text

  }

}