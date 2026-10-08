export type GameAlertType = "release_date" | "released" | "news" | "guide";

export function gameAlertIcon(type: GameAlertType) {
  return ({ release_date: "event", released: "rocket_launch", news: "newspaper", guide: "menu_book" } as const)[type];
}

export function gameAlertCopy(type: GameAlertType, gameTitle: string, sourceId: string) {
  if (type === "release_date") {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(sourceId)
      ? new Date(`${sourceId}T00:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
      : sourceId;
    return `${gameTitle} tiene fecha de lanzamiento: ${date}.`;
  }
  if (type === "released") return `${gameTitle} ya está disponible.`;
  if (type === "news") return `Hay una nueva noticia de ${gameTitle}.`;
  return `Hay una nueva guía de ${gameTitle}.`;
}
