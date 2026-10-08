import { AdminNav } from "@/components/AdminNav";
import { AdminArticleForm } from "@/components/AdminArticleForm";
import { createArticle } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin";

type Search = Promise<{ error?: string }>;
export default async function NuevaNoticia({ searchParams }: { searchParams: Search }) {
  const { supabase } = await requireAdmin("/admin/noticias/nueva");
  const params = await searchParams;
  const { data: games } = await supabase.from("games").select("slug,title").order("title");
  return <div className="shell pageStack"><section className="adminTitleRow"><div><span className="eyebrow">EDITORIAL</span><h1>Nueva noticia</h1></div></section><AdminNav />{params.error && <p className="notice error">{params.error}</p>}<AdminArticleForm action={createArticle} games={games ?? []} submitLabel="Guardar noticia" /></div>;
}
