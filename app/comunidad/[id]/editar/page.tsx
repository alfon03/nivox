import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateCommunityPost } from "@/app/comunidad/actions";
import { CommunityImageUpload } from "@/components/CommunityImageUpload";
import { requireUser } from "@/lib/auth";
import { isUuid } from "@/lib/community";
import { MaterialIcon } from "@/components/MaterialIcon";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default async function EditCommunityPostPage({ params, searchParams }: Props) {
  const { id } = await params; const query = await searchParams;
  if (!isUuid(id)) notFound();
  const { supabase, user } = await requireUser(`/comunidad/${id}/editar`);
  const [{ data: post }, { data: games }] = await Promise.all([
    supabase.from("community_posts").select("id,author_id,title,body,type,game_slug,image_url,has_spoiler,status").eq("id", id).maybeSingle(),
    supabase.from("games").select("slug,title").eq("status", "published").order("title"),
  ]);
  if (!post) notFound();
  if (post.author_id !== user.id) redirect(`/comunidad/${id}`);
  if (post.status !== "published") redirect("/comunidad");

  return <div className="shell authShell communityComposeShell"><section className="authCard panel communityCompose">
    <Link className="backLink" href={`/comunidad/${id}`}><MaterialIcon name="arrow_back" size={17}/>Volver a la publicación</Link>
    <span className="eyebrow">EDITAR PUBLICACIÓN</span><h1>Actualizar contenido</h1>
    {query.error && <div className="notice error">{query.error}</div>}
    <form action={updateCommunityPost} className="authForm">
      <input type="hidden" name="post_id" value={id} />
      <label>Tipo<select name="type" defaultValue={post.type}><option value="debate">Debate</option><option value="pregunta">Pregunta</option><option value="teoria">Teoría</option><option value="captura">Captura</option><option value="coleccion">Colección</option></select></label>
      <label>Juego <span className="fieldHint">opcional</span><select name="game_slug" defaultValue={post.game_slug ?? ""}><option value="">General / sin juego</option>{games?.map((g) => <option value={g.slug} key={g.slug}>{g.title}</option>)}</select></label>
      <label>Título<input name="title" required minLength={5} maxLength={140} defaultValue={post.title} /></label>
      <label>Contenido<textarea name="body" required minLength={10} maxLength={5000} rows={10} defaultValue={post.body} /></label>
      <label className="spoilerToggle"><input type="checkbox" name="has_spoiler" defaultChecked={post.has_spoiler} /> <span>Contiene spoilers</span></label>
      <label>Imagen <span className="fieldHint">opcional</span><CommunityImageUpload initialUrl={post.image_url ?? ""} /></label>
      <p className="microcopy">NIVOX guarda una versión anterior cada vez que editas.</p>
      <button className="primaryBtn" type="submit">Guardar cambios</button>
    </form>
  </section></div>;
}
