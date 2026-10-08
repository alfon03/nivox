# NIVOX v0.11 — Preparación para producción

Esta versión parte de **v0.10.4-hotfix.3** y mantiene todas las funciones anteriores. El objetivo de v0.11 es preparar NIVOX para salir a Internet con una base más sólida de SEO, seguridad, antispam, recuperación de cuenta, páginas legales y administración de portadas.

## 1. Actualizar desde v0.10.4-hotfix.3

1. Descomprime esta carpeta.
2. Copia tu `.env.local` anterior.
3. Añade las variables nuevas usando `.env.example` como referencia.
4. En **Supabase → SQL Editor**, ejecuta una sola vez:

```text
supabase/migrate_v0.11.sql
```

5. Instala y compila:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd start
```

Para desarrollo puedes usar `npm.cmd run dev`.

## 2. Variables de entorno nuevas

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_LEGAL_NAME=Tu nombre o razón social
NEXT_PUBLIC_LEGAL_EMAIL=contacto@tudominio.com
NEXT_PUBLIC_LEGAL_ADDRESS=Tu dirección legal aplicable
```

Cuando publiques NIVOX, cambia `NEXT_PUBLIC_SITE_URL` por tu HTTPS real, por ejemplo `https://nivox.es`.

**No publiques la web con los textos “Tu nombre…” o “Pendiente de configurar”.** Las páginas legales son una base técnica y editorial; revisa los textos y datos con asesoramiento adecuado a tu situación antes del lanzamiento comercial.

## 3. Qué añade v0.11

### SEO
- Metadata dinámica para juegos, noticias y guías.
- Canonical URLs.
- Open Graph y Twitter cards.
- Imagen Open Graph general de NIVOX.
- `robots.txt` dinámico.
- `sitemap.xml` con juegos, noticias y guías publicados.
- JSON-LD para `VideoGame`, `NewsArticle` y guías.
- Zonas privadas y perfiles de usuario marcados `noindex` donde procede.

### Seguridad
- Cabeceras `nosniff`, `DENY`, Referrer-Policy, Permissions-Policy y COOP.
- En producción: HSTS + Content Security Policy.
- El header `X-Powered-By` queda desactivado.
- Rate limiting **dentro de PostgreSQL** para publicaciones, comentarios, reseñas, denuncias, follows y votos. Esto protege también frente a peticiones directas a Supabase, no solo contra el formulario de NIVOX.
- Se mantienen RLS y validación de Storage de versiones anteriores.

### Rendimiento
- Índices `pg_trgm` para las búsquedas principales.
- `/api/health` permite comprobar si NIVOX y Supabase están respondiendo.

### Cuenta
- “¿Has olvidado tu contraseña?” en Login.
- Flujo de recuperación y cambio de contraseña.

### Administración de juegos
- Nuevo bucket `game-covers`.
- El límite de Server Actions se ajusta a 6 MB; la portada se valida a máximo 5 MB.
- Desde **Admin → Juegos** puedes subir directamente JPG/PNG/WEBP de máximo 5 MB.
- La imagen subida tiene prioridad sobre la URL manual.

### Páginas legales y UX
- `/privacidad`
- `/cookies`
- `/terminos`
- `/aviso-legal`
- `/contacto`
- aviso de cookies técnicas (NIVOX no carga analítica/publicidad opcional todavía)
- página 404 y páginas de error cuidadas
- checklist de producción dentro de `/admin`

## 4. Recuperación de contraseña en Supabase

En **Supabase → Authentication → URL Configuration**:

- En local, permite `http://localhost:3000/**`.
- En producción, añade tu dominio final, por ejemplo `https://nivox.es/**`.
- Cambia también el **Site URL** al dominio real cuando publiques.

NIVOX envía la recuperación a:

```text
/auth/callback?next=/auth/update-password
```

El callback intercambia el código PKCE por una sesión y envía al usuario al formulario de nueva contraseña.

## 5. SMTP antes de abrir registros públicos

El correo integrado de Supabase sirve para desarrollo, pero tiene límites muy bajos. Antes del lanzamiento configura un SMTP propio en **Supabase → Authentication → Emails / SMTP** (la ubicación exacta puede variar en el dashboard).

Utiliza una dirección real, por ejemplo `no-reply@tudominio.com`, y comprueba:
- alta y confirmación de cuenta;
- recuperación de contraseña;
- entregabilidad y carpeta de spam;
- dominio/remitente verificado por tu proveedor de correo.

No guardes contraseñas SMTP en variables `NEXT_PUBLIC_*`.

## 6. Portadas

Después de ejecutar `migrate_v0.11.sql`:

1. Entra como administrador.
2. Ve a **Admin → Juegos → Editar**.
3. Selecciona una imagen en “Subir portada”.
4. Guarda.
5. La URL pública se almacena automáticamente en `games.cover_url`.

Usa únicamente imágenes que tengas derecho a publicar.

## 7. Antispam

Los límites iniciales son deliberadamente razonables para una comunidad nueva:
- publicaciones: 20/h, mínimo 10 s entre altas;
- comentarios: 60/h, mínimo 3 s;
- reseñas: 12/h, mínimo 10 s;
- denuncias: 20/h, mínimo 3 s;
- follows: 80/h;
- votos: 300/h por tipo.

Si NIVOX crece y quieres cambiar estos valores, edita los argumentos de los triggers en `migrate_v0.11.sql` y crea una migración nueva; no edites migraciones ya aplicadas en producción.

## 8. Pruebas antes del dominio real

Prueba al menos:

```text
/
/juegos
/noticias
/guias
/comunidad
/ranking
/logros
/lanzamientos
/sitemap.xml
/robots.txt
/api/health
/privacidad
/cookies
/auth/recuperar
/admin/juegos
```

Después ejecuta:

```powershell
npm audit --omit=dev
npm.cmd run build
npm.cmd start
```

En tu instalación anterior, `npm audit --omit=dev` devolvía `0 vulnerabilities`. No uses `npm audit fix --force` a ciegas: npm estaba proponiendo bajar `eslint-config-next` a una versión incompatible.

## 9. Backups y migraciones

Antes de cada migración importante o lanzamiento:
- haz una copia/exportación de la base según las opciones disponibles en tu plan de Supabase;
- conserva todos los `.sql` del directorio `supabase/` en control de versiones;
- no borres migraciones que ya se hayan ejecutado;
- prueba migraciones nuevas primero en un proyecto de staging cuando NIVOX tenga usuarios reales.

## 10. Checklist previo al lanzamiento

- [ ] dominio HTTPS definitivo;
- [ ] `NEXT_PUBLIC_SITE_URL` real;
- [ ] datos legales reales revisados;
- [ ] SMTP propio probado;
- [ ] emails de confirmación y recuperación probados;
- [ ] portada/subida de imágenes probada;
- [ ] `npm audit --omit=dev` revisado;
- [ ] `npm run build` limpio;
- [ ] `/api/health` devuelve `ok: true`;
- [ ] `robots.txt` y `sitemap.xml` correctos;
- [ ] backup realizado;
- [ ] prueba con usuario normal y administrador;
- [ ] prueba responsive móvil/tablet/escritorio.

## Siguiente fase

Una vez v0.11 esté validada, NIVOX ya estará mucho más cerca de poder desplegarse públicamente. La siguiente fase propuesta es **v0.12: NIVOX+ / Premium, pagos y monetización**, pero conviene publicar primero una versión pública controlada y observar uso real antes de activar cobros.
