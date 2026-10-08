const reservedUsernames = new Set(["admin", "administrator", "moderator", "nivox", "soporte", "support", "staff", "oficial", "official"]);

const blockedTerms = [
  "puta", "puto", "putas", "putos", "mierda", "joder", "gilipollas", "cabron", "cabrones", "cono", "polla", "pollas", "follar",
  "fuck", "fucking", "shit", "bitch", "asshole", "cunt",
  "maricon", "maricones", "subnormal"
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/[^a-z0-9_\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function containsBlockedLanguage(value: string) {
  const normalized = normalizeText(value);

  return blockedTerms.some((term) => {
    const normalizedTerm = normalizeText(term);
    const letters = [...normalizedTerm].map(escapeRegex).join("[\\s_-]*");
    return new RegExp(`(?:^|[\\s_-])${letters}(?:$|[\\s_-])`, "i").test(normalized);
  });
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string): string | null {
  const username = value.trim();
  if (username.length < 3 || username.length > 20) {
    return "El nombre de usuario debe tener entre 3 y 20 caracteres.";
  }
  if (!/^[A-Za-z0-9_]+$/.test(username)) {
    return "El nombre de usuario solo puede contener letras, números y guion bajo.";
  }
  if (reservedUsernames.has(username.toLowerCase())) {
    return "Ese nombre de usuario está reservado.";
  }
  const compactUsername = normalizeText(username).replace(/[\s_-]+/g, "");
  if (blockedTerms.some((term) => compactUsername.includes(normalizeText(term)))) {
    return "Ese nombre de usuario no está permitido.";
  }
  return null;
}

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
    return "Escribe una dirección de correo válida.";
  }
  return null;
}

export function validatePublicText(value: string, label = "El texto", maxLength?: number): string | null {
  const text = value.trim();
  if (typeof maxLength === "number" && text.length > maxLength) {
    return `${label} supera el máximo de ${maxLength} caracteres.`;
  }
  if (text && containsBlockedLanguage(text)) {
    return `${label} contiene lenguaje no permitido.`;
  }
  return null;
}
