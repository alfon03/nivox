"use client";
import { useEffect } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/MaterialIcon";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("NIVOX page error", error); }, [error]);
  return <div className="shell systemPage"><div className="panel systemCard"><MaterialIcon name="error" size={44}/><span className="eyebrow">ALGO HA FALLADO</span><h1>No hemos podido cargar esta página</h1><p>Prueba de nuevo. Si el problema continúa, vuelve al inicio.</p><div className="systemActions"><button className="primaryBtn" onClick={reset}>Reintentar</button><Link className="ghostBtn inlineBtn" href="/">Inicio</Link></div>{error.digest && <small>Referencia: {error.digest}</small>}</div></div>;
}
