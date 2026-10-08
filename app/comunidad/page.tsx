import Link from "next/link";
import { toggleCommunityVote } from "@/app/comunidad/actions";
import { communityTypeLabel, fetchCommunityPosts, isCommunityType } from "@/lib/community";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { MaterialIcon } from "@/components/MaterialIcon";

export const metadata = { title: "Comunidad" };
type Props = { searchParams: Promise<{ sort?: string; type?: string; message?: string }> };

function relativeTime(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export default async function ComunidadPage({ searchParams }: Props) {
  const params = await searchParams;
  if (!isSupabaseConfigured()) return <div className="shell pageStack"><section className="pageHero compact"><span className="eyebrow">COMUNIDAD NIVOX</span><h1>Conecta Supabase</h1><p>La comunidad necesita la base de datos configurada.</p></section></div>;
  const type = params.type && isCommunityType(params.type) ? params.type : "";
  const sort = params.sort === "popular" ? "popular" : "recent";
  const { posts, userId } = await fetchCommunityPosts({ sort, type });
  const filters = [
    ["Todo", "/comunidad"], ["Preguntas", "/comunidad?type=pregunta"], ["Teorías", "/comunidad?type=teoria"], ["Capturas", "/comunidad?type=captura"], ["Colecciones", "/comunidad?type=coleccion"],
  ] as const;

  return <div className="shell pageStack">
    <section className="communityHero"><div><span className="eyebrow">COMUNIDAD NIVOX</span><h1>Comparte. Pregunta. Debate.</h1><p>Publicaciones reales de la comunidad: teorías, dudas, capturas y colecciones.</p><Link className="feedShortcut" href="/feed"><MaterialIcon name="auto_awesome" size={17}/>Abrir mi feed personalizado</Link></div><Link className="primaryBtn" href={userId ? "/comunidad/nueva" : "/auth/login?next=/comunidad/nueva"}><MaterialIcon name="add" size={18}/>Crear publicación</Link></section>
    {params.message && <div className="notice success">{params.message}</div>}
    <div className="communityToolbar">
      <div className="filters">{filters.map(([label, href]) => <Link className={(type ? href.includes(`type=${type}`) : href === "/comunidad") ? "active" : ""} key={href} href={href}>{label}</Link>)}</div>
      <div className="sortLinks"><Link className={sort === "recent" ? "active" : ""} href={type ? `/comunidad?type=${type}` : "/comunidad"}>Recientes</Link><Link className={sort === "popular" ? "active" : ""} href={`/comunidad?sort=popular${type ? `&type=${type}` : ""}`}>Populares</Link></div>
    </div>
    <section className="feed">
      {posts.map((post) => <article className="postCard feedPost communityPostCard" key={post.id}>
        <div className="postUser"><span className="avatar">{post.author.username.slice(0,1).toUpperCase()}</span><div><Link className="authorLink" href={`/usuarios/${post.author.username}`}><b>@{post.author.username}</b></Link><small>{relativeTime(post.created_at)}{post.game ? ` · ${post.game.title}` : ""}{post.edited_at ? " · editado" : ""}</small></div><span className="tag">{communityTypeLabel(post.type)}</span></div>
        <Link className="postTitleLink" href={`/comunidad/${post.id}`}><h2>{post.title}</h2></Link>
        {post.has_spoiler ? <details className="spoilerBlock"><summary><MaterialIcon name="warning" size={18}/>Mostrar spoiler</summary><p>{post.body}</p>{post.image_url && <img className="communityImage" src={post.image_url} alt="Contenido con spoiler" />}</details> : <><p>{post.body.length > 380 ? `${post.body.slice(0, 380)}…` : post.body}</p>{post.image_url && <Link href={`/comunidad/${post.id}`}><img className="communityImage" src={post.image_url} alt="Imagen de la publicación" /></Link>}</>}
        <div className="postMeta communityActions">
          <form action={toggleCommunityVote}><input type="hidden" name="post_id" value={post.id}/><input type="hidden" name="return_to" value="/comunidad"/><button className={post.votedByMe ? "voteBtn active" : "voteBtn"} type="submit"><MaterialIcon name="arrow_upward" size={17}/>{post.vote_count}</button></form>
          <Link href={`/comunidad/${post.id}#comentarios`}><MaterialIcon name="chat_bubble" size={16}/>{post.comment_count}</Link>
          <Link href={`/comunidad/${post.id}`}>Abrir conversación</Link>
        </div>
      </article>)}
      {!posts.length && <div className="panel emptyState"><h3>Todavía no hay publicaciones</h3><p>Sé la primera persona en abrir una conversación en NIVOX.</p><Link className="primaryBtn inlineBtn" href={userId ? "/comunidad/nueva" : "/auth/login?next=/comunidad/nueva"}>Crear publicación</Link></div>}
    </section>
  </div>;
}
