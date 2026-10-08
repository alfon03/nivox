import Link from "next/link";
import { redirect } from "next/navigation";
import { toggleCommunityVote } from "@/app/comunidad/actions";
import { communityTypeLabel, fetchPersonalizedFeed } from "@/lib/community";
import { createClient } from "@/lib/supabase/server";
import { MaterialIcon } from "@/components/MaterialIcon";

export const metadata = { title: "Para ti" };

export default async function FeedPage() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/feed");
  const { posts } = await fetchPersonalizedFeed(40);
  return <div className="shell pageStack">
    <section className="communityHero"><div><span className="eyebrow">PARA TI</span><h1>Tu feed NIVOX</h1><p>Priorizamos jugadores que sigues, juegos de tu biblioteca y conversaciones relevantes.</p></div><Link className="primaryBtn" href="/comunidad/nueva"><MaterialIcon name="add" size={18}/>Crear publicación</Link></section>
    <div className="feedReasonLegend"><span>La selección cambia según lo que sigues y guardas.</span><Link href="/comunidad">Ver toda la comunidad <MaterialIcon name="arrow_forward" size={16}/></Link></div>
    <section className="feed">{posts.map((post:any)=><article className="postCard feedPost communityPostCard" key={post.id}>
      <div className="feedReason"><MaterialIcon name="auto_awesome" size={16}/>{post.feedReason}</div>
      <div className="postUser"><span className="avatar">{post.author.username.slice(0,1).toUpperCase()}</span><div><Link className="authorLink" href={`/usuarios/${post.author.username}`}><b>@{post.author.username}</b></Link><small>{new Date(post.created_at).toLocaleDateString("es-ES")}{post.game?` · ${post.game.title}`:""}{post.edited_at?" · editado":""}</small></div><span className="tag">{communityTypeLabel(post.type)}</span></div>
      <Link className="postTitleLink" href={`/comunidad/${post.id}`}><h2>{post.title}</h2></Link>
      {post.has_spoiler ? <details className="spoilerBlock"><summary><MaterialIcon name="warning" size={18}/>Mostrar spoiler</summary><p>{post.body}</p>{post.image_url&&<img className="communityImage" src={post.image_url} alt="Contenido con spoiler"/>}</details> : <><p>{post.body.length>380?`${post.body.slice(0,380)}…`:post.body}</p>{post.image_url&&<Link href={`/comunidad/${post.id}`}><img className="communityImage" src={post.image_url} alt="Imagen de la publicación"/></Link>}</>}
      <div className="postMeta communityActions"><form action={toggleCommunityVote}><input type="hidden" name="post_id" value={post.id}/><input type="hidden" name="return_to" value="/feed"/><button className={post.votedByMe?"voteBtn active":"voteBtn"}><MaterialIcon name="arrow_upward" size={17}/>{post.vote_count}</button></form><Link href={`/comunidad/${post.id}#comentarios`}><MaterialIcon name="chat_bubble" size={16}/>{post.comment_count}</Link><Link href={`/comunidad/${post.id}`}>Abrir conversación</Link></div>
    </article>)}{!posts.length&&<div className="panel emptyState"><h3>Aún no hay contenido</h3><p>Sigue a jugadores, añade juegos a tu biblioteca o crea la primera publicación.</p></div>}</section>
  </div>;
}
