export const SITE_NAME = "NIVOX";
export const SITE_DESCRIPTION = "Noticias, videojuegos, guías, reseñas y comunidad gaming.";

export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function absoluteUrl(path = "/") {
  const base = getSiteUrl();
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export const legalConfig = {
  owner: process.env.NEXT_PUBLIC_LEGAL_NAME?.trim() || "Pendiente de configurar",
  email: process.env.NEXT_PUBLIC_LEGAL_EMAIL?.trim() || "Pendiente de configurar",
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS?.trim() || "Pendiente de configurar",
};
