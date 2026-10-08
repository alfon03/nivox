import Link from "next/link";
import { MaterialIcon } from "@/components/MaterialIcon";

export default function NotFound() {
  return <div className="shell systemPage"><div className="panel systemCard"><MaterialIcon name="explore_off" size={44}/><span className="eyebrow">ERROR 404</span><h1>Esta zona del mapa no existe</h1><p>La página que buscas se ha movido, se ha eliminado o la dirección no es correcta.</p><div className="systemActions"><Link className="primaryBtn" href="/">Volver al inicio</Link><Link className="ghostBtn inlineBtn" href="/buscar">Buscar en NIVOX</Link></div></div></div>;
}
