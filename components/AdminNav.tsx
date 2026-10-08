import Link from "next/link";

const links = [
  ["Resumen", "/admin"],
  ["Noticias", "/admin/noticias"],
  ["Guías", "/admin/guias"],
  ["Juegos", "/admin/juegos"],
  ["Moderación", "/admin/moderacion"],
] as const;

export function AdminNav() {
  return (
    <nav className="adminNav" aria-label="Administración">
      {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
    </nav>
  );
}
