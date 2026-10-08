import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/AdminNav";
import { deleteArticle } from "@/app/admin/actions";

export const metadata = { title: "Admin · Noticias" };

type Search = Promise<{ message?: string; error?: string }>;
export default async function AdminNoticias({ searchParams }: { searchParams: Search }) {
  const { supabase } = await requireAdmin("/admin/noticias");
  const params = await searchParams;
  const { data: articles } = await supabase.from("articles").select("id,title,slug,category,status,updated_at,published_at").order("updated_at", { ascending: false });
  return <div className="shell pageStack"><section className="adminTitleRow"><div><span className="eyebrow">EDITORIAL</span><h1>Noticias</h1></div><Link className="primaryBtn inlineBtn" href="/admin/noticias/nueva">+ Nueva noticia</Link></section><AdminNav />{params.message && <p className="notice success">{params.message}</p>}{params.error && <p className="notice error">{params.error}</p>}<section className="panel adminTableWrap"><table className="adminTable"><thead><tr><th>Título</th><th>Categoría</th><th>Estado</th><th>Actualizada</th><th></th></tr></thead><tbody>{articles?.map(a => <tr key={a.id}><td><strong>{a.title}</strong><small>/{a.slug}</small></td><td>{a.category}</td><td><span className={`statusBadge ${a.status}`}>{a.status === "published" ? "Publicada" : "Borrador"}</span></td><td>{new Date(a.updated_at).toLocaleDateString("es-ES")}</td><td className="tableActions"><Link href={`/admin/noticias/${a.id}/editar`}>Editar</Link><form action={deleteArticle}><input type="hidden" name="id" value={a.id}/><button type="submit">Borrar</button></form></td></tr>)}{!articles?.length && <tr><td colSpan={5}><div className="emptyState"><h3>Aún no hay noticias</h3><p>Crea la primera desde el botón superior.</p></div></td></tr>}</tbody></table></section></div>;
}
