export type Game = {
  slug: string;
  title: string;
  genre: string;
  platform: string;
  score: string;
  accent: string;
  description: string;
  cover_url?: string | null;
};

export const games: Game[] = [
  { slug: "gta-vi", title: "GTA VI", genre: "Acción · Mundo abierto", platform: "PS5 · Xbox", score: "9.6", accent: "sunset", description: "Vice City vuelve con una nueva historia criminal y un enorme mundo abierto." },
  { slug: "elden-ring", title: "Elden Ring", genre: "RPG · Acción", platform: "PC · PS · Xbox", score: "9.5", accent: "gold", description: "Exploración, jefes y construcción de personajes en un mundo oscuro." },
  { slug: "zelda-totk", title: "Zelda: TotK", genre: "Aventura", platform: "Nintendo", score: "9.3", accent: "sky", description: "Explora Hyrule, sus cielos y profundidades con libertad total." },
  { slug: "baldurs-gate-3", title: "Baldur's Gate 3", genre: "RPG", platform: "PC · PS5 · Xbox", score: "9.6", accent: "ember", description: "Decisiones, personajes y combates tácticos en una aventura gigantesca." },
  { slug: "silksong", title: "Hollow Knight: Silksong", genre: "Metroidvania", platform: "Multiplataforma", score: "9.1", accent: "crimson", description: "Explora un reino de insectos, secretos y combates precisos." }
];

export const news = [
  { title: "Los mundos abiertos que van a marcar la próxima generación", tag: "Especial", time: "Hace 2 h" },
  { title: "Nintendo prepara nuevas funciones sociales para sus próximos juegos", tag: "Nintendo", time: "Hace 4 h" },
  { title: "Los RPG más esperados que debes tener en el radar", tag: "RPG", time: "Hace 6 h" },
  { title: "PC, consola o portátil: así está cambiando la forma de jugar", tag: "Hardware", time: "Hace 8 h" }
];

export const guides = [
  { title: "Cómo empezar bien en Elden Ring", game: "Elden Ring", meta: "Builds · Primeras horas" },
  { title: "Guía de santuarios y progreso", game: "Zelda: TotK", meta: "Coleccionables · Mapa" },
  { title: "Qué hacer antes de comenzar una partida larga", game: "Baldur's Gate 3", meta: "Consejos · RPG" },
  { title: "Configuración recomendada para jugar en PC", game: "Cyberpunk 2077", meta: "Rendimiento · PC" }
];

export const communityPosts = [
  { user: "LunaRaven", level: 24, type: "Debate", title: "¿Qué juego os ha sorprendido más este año?", body: "Busco algo que me enganche de verdad. Me valen RPG, aventura o acción.", votes: 842, comments: 126 },
  { user: "Kaito", level: 18, type: "Colección", title: "Mi estantería ha crecido otra vez 🎮", body: "He añadido tres ediciones físicas. ¿Qué juego no puede faltar en una colección?", votes: 524, comments: 64 },
  { user: "PixelNomad", level: 12, type: "Guía", title: "Mis consejos para no atascarse con un jefe", body: "He reunido lo que me ha funcionado: equipo, ritmo del combate y errores frecuentes.", votes: 312, comments: 27 }
];
