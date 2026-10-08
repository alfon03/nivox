export function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function validateSlug(value: string) {
  if (!value) return "El slug no puede estar vacío.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return "El slug solo puede contener letras minúsculas, números y guiones.";
  if (value.length > 90) return "El slug es demasiado largo.";
  return null;
}

export function formText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export function nullableText(formData: FormData, name: string) {
  const value = formText(formData, name);
  return value || null;
}

export function parseScore(value: string) {
  if (!value) return null;
  const score = Number(value.replace(",", "."));
  if (!Number.isFinite(score) || score < 0 || score > 10) return null;
  return Number(score.toFixed(1));
}
