"use client";
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="es"><body><main style={{fontFamily:"system-ui",padding:"3rem",maxWidth:720,margin:"auto"}}><h1>NIVOX no ha podido cargarse</h1><p>Se ha producido un error inesperado.</p><button onClick={reset}>Reintentar</button></main></body></html>;
}
