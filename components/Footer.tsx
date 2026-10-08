import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footerGrid">
        <div><strong>NIVOX</strong><p>Noticias, guías, reseñas y comunidad para jugadores.</p></div>
        <div className="footerLinks"><Link href="/noticias">Noticias</Link><Link href="/juegos">Juegos</Link><Link href="/guias">Guías</Link><Link href="/comunidad">Comunidad</Link><Link href="/normas-comunidad">Normas</Link></div>
        <div className="footerLinks footerLegalLinks"><Link href="/privacidad">Privacidad</Link><Link href="/cookies">Cookies</Link><Link href="/terminos">Términos</Link><Link href="/aviso-legal">Aviso legal</Link><Link href="/contacto">Contacto</Link></div>
        <div className="footerLegal">NIVOX · Proyecto independiente sobre videojuegos</div>
      </div>
    </footer>
  );
}
