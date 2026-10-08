import type { Metadata } from "next";
import { legalConfig } from "@/lib/site";
export const metadata: Metadata = { title: "Contacto", description: "Contacta con NIVOX." };
export default function Page(){ return <div className="shell legalPage"><span className="eyebrow">NIVOX</span><h1>Contacto</h1><p className="lead">Para soporte, privacidad, retirada de contenido o cuestiones legales:</p><div className="panel contactPanel"><b>{legalConfig.email}</b><p>Antes del lanzamiento público, sustituye este valor por un correo real de soporte.</p></div><p>Para denunciar contenido dentro de la comunidad, utiliza preferentemente el botón <b>Denunciar</b> de la publicación, comentario, reseña o perfil correspondiente.</p></div>; }
