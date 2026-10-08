import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/AdminNav";
import { deleteGuide } from "@/app/admin/actions";

type Search = Promise<{ message?: string; error?: string }>;
export default async function AdminGuias({ searchParams }: { searchParams: Search }) {
  const { supabase } = await requireAdmin("/admin/guias"); const params = await searchParams;
  const { data: guides } = await supabase.from("guides").select("id,title,slug,status,game_slug,updated_at").order("updated_at", { ascending: false });
  return <div className="shell pageStack"><section className="adminTitleRow"><div><span className="eyebrow">CONTENIDO</span><h1>Guías</h1></div><Link className="primaryBtn inlineBtn" href="/admin/guias/nueva">+ Nueva guía</Link></section><AdminNav />{params.message && <p className="notice success">{params.message}</p>}{params.error && <p className="notice error">{params.error}</p>}<section className="panel adminTableWrap"><table className="adminTable"><thead><tr><th>Título</th><th>Juego</th><th>Estado</th><th>Actualizada</th><th></th></tr></thead><tbody>{guides?.map(g => <tr key={g.id}><td><strong>{g.title}</strong><small>/{g.slug}</small></td><td>{g.game_slug ?? "—"}</td><td><span className={`statusBadge ${g.status}`}>{g.status === "published" ? "Publicada" : "Borrador"}</span></td><td>{new Date(g.updated_at).toLocaleDateString("es-ES")}</td><td className="tableActions"><Link href={`/admin/guias/${g.id}/editar`}>Editar</Link><form action={deleteGuide}><input type="hidden" name="id" value={g.id}/><button type="submit">Borrar</button></form></td></tr>)}{!guides?.length && <tr><td colSpan={5}><div className="emptyState"><h3>Aún no hay guías</h3></div></td></tr>}</tbody></table></section></div>;
}
