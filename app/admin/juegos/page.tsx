import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/AdminNav";
import { deleteGame } from "@/app/admin/actions";

type Search = Promise<{ message?: string; error?: string }>;
export default async function AdminJuegos({ searchParams }: { searchParams: Search }) {
  const { supabase } = await requireAdmin("/admin/juegos"); const params = await searchParams;
  const { data: games } = await supabase.from("games").select("slug,title,genre,platform,score,status,release_date").order("title");
  return <div className="shell pageStack"><section className="adminTitleRow"><div><span className="eyebrow">CATÁLOGO</span><h1>Juegos</h1></div><Link className="primaryBtn inlineBtn" href="/admin/juegos/nuevo">+ Nuevo juego</Link></section><AdminNav />{params.message && <p className="notice success">{params.message}</p>}{params.error && <p className="notice error">{params.error}</p>}<section className="panel adminTableWrap"><table className="adminTable"><thead><tr><th>Juego</th><th>Plataformas</th><th>Nota</th><th>Estado</th><th></th></tr></thead><tbody>{games?.map(g => <tr key={g.slug}><td><strong>{g.title}</strong><small>/{g.slug}</small></td><td>{g.platform ?? "—"}</td><td>{g.score ?? "—"}</td><td><span className={`statusBadge ${g.status}`}>{g.status === "published" ? "Publicado" : "Borrador"}</span></td><td className="tableActions"><Link href={`/admin/juegos/${g.slug}/editar`}>Editar</Link><form action={deleteGame}><input type="hidden" name="slug" value={g.slug}/><button type="submit">Borrar</button></form></td></tr>)}{!games?.length && <tr><td colSpan={5}><div className="emptyState"><h3>No hay juegos</h3></div></td></tr>}</tbody></table></section></div>;
}
