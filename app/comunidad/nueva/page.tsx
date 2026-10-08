import Link from "next/link";
import { createCommunityPost } from "@/app/comunidad/actions";
import { CommunityImageUpload } from "@/components/CommunityImageUpload";
import { requireUser } from "@/lib/auth";
import { MaterialIcon } from "@/components/MaterialIcon";

export const metadata = { title: "Nueva publicación" };
type Props = { searchParams: Promise<{ error?: string }> };

export default async function NuevaPublicacionPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase } = await requireUser("/comunidad/nueva");
  const { data: games } = await supabase.from("games").select("slug,title").eq("status", "published").order("title");
  return <div className="shell authShell communityComposeShell"><section className="authCard panel communityCompose">
    <Link className="backLink" href="/comunidad"><MaterialIcon name="arrow_back" size={17}/>Comunidad</Link>
    <span className="eyebrow">PUBLICAR EN NIVOX</span><h1>Nueva publicación</h1><p className="lead">Pregunta, comparte una teoría o enseña una captura. El contenido pasa por las normas de la comunidad.</p>
    {params.error && <div className="notice error">{params.error}</div>}
    <form action={createCommunityPost} className="authForm">
      <label>Tipo<select name="type" defaultValue="debate"><option value="debate">Debate</option><option value="pregunta">Pregunta</option><option value="teoria">Teoría</option><option value="captura">Captura</option><option value="coleccion">Colección</option></select></label>
      <label>Juego <span className="fieldHint">opcional</span><select name="game_slug" defaultValue=""><option value="">General / sin juego</option>{games?.map((g) => <option value={g.slug} key={g.slug}>{g.title}</option>)}</select></label>
      <label>Título<input name="title" required minLength={5} maxLength={140} placeholder="¿De qué quieres hablar?" /></label>
      <label>Contenido<textarea name="body" required minLength={10} maxLength={5000} rows={9} placeholder="Cuéntale a la comunidad…" /></label>
      <label className="spoilerToggle"><input type="checkbox" name="has_spoiler" /> <span>Contiene spoilers</span></label>
      <label>Imagen <span className="fieldHint">opcional</span><CommunityImageUpload /></label>
      <p className="microcopy">No se permite lenguaje ofensivo, spam, contenido ilegal ni material que no tengas derecho a publicar. Las publicaciones pueden ser denunciadas y moderadas.</p>
      <button className="primaryBtn" type="submit">Publicar</button>
    </form>
  </section></div>;
}
