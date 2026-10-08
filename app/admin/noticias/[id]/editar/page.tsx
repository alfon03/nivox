import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { AdminArticleForm } from "@/components/AdminArticleForm";
import { updateArticle } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin";

type Params = Promise<{ id: string }>;
type Search = Promise<{ error?: string }>;
export default async function EditarNoticia({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { id } = await params;
  const { supabase } = await requireAdmin(`/admin/noticias/${id}/editar`);
  const query = await searchParams;
  const [{ data: article }, { data: games }] = await Promise.all([
    supabase.from("articles").select("*").eq("id", id).maybeSingle(),
    supabase.from("games").select("slug,title").order("title"),
  ]);
  if (!article) notFound();
  return <div className="shell pageStack"><section className="adminTitleRow"><div><span className="eyebrow">EDITORIAL</span><h1>Editar noticia</h1></div></section><AdminNav />{query.error && <p className="notice error">{query.error}</p>}<AdminArticleForm action={updateArticle} value={article} games={games ?? []} submitLabel="Guardar cambios" /></div>;
}
