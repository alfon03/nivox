export const gamingPlatformLabels: Record<string, string> = {
  psn: "PlayStation Network",
  xbox: "Xbox",
  steam: "Steam",
  nintendo: "Nintendo",
  epic: "Epic Games",
  discord: "Discord",
  riot: "Riot Games",
  battlenet: "Battle.net",
  twitch: "Twitch",
};

export function completionKindLabel(value: string | null | undefined) {
  return ({
    platinum: "Platino",
    all_achievements: "Todos los logros",
    hundred_percent: "100 %",
    none: "",
  } as Record<string, string>)[value ?? "none"] ?? "";
}

export function completionKindIcon(value: string | null | undefined) {
  return ({
    platinum: "trophy",
    all_achievements: "military_tech",
    hundred_percent: "verified",
    none: "",
  } as Record<string, string>)[value ?? "none"] ?? "";
}

export function formatPlaytime(totalMinutes: number | null | undefined) {
  const total = Math.max(0, Number(totalMinutes ?? 0));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours && !minutes) return "0 h";
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}
