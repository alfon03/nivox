import Link from "next/link";
import { notFound } from "next/navigation";
import { createCommunityComment, deleteCommunityComment, deleteCommunityPost, toggleCommunityVote, updateCommunityComment } from "@/app/comunidad/actions";
import { communityTypeLabel, fetchCommunityPost } from "@/lib/community";
import { MaterialIcon } from "@/components/MaterialIcon";

type Params = Promise<{ id: string }>;
type Search = Promise<{ error?: string; message?: string }>;
function date(value: string) { return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }

export default async function CommunityPostPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { id } = await params; const query = await searchParams; const data = await fetchCommunityPost(id); if (!data) notFound();
  const { post, comments, userId } = data; const isOwner = userId === post.author_id;
  return <div className="shell communityDetail pageStack">
    <Link className="backLink" href="/comunidad"><MaterialIcon name="arrow_back" size={17}/>Comunidad</Link>
    {query.error && <div className="notice error">{query.error}</div>}{query.message && <div className="notice success">{query.message}</div>}
    <article className="panel communityDetailPost">
      <div className="postUser"><span className="avatar">{post.author.username.slice(0,1).toUpperCase()}</span><div><Link className="authorLink" href={`/usuarios/${post.author.username}`}><b>@{post.author.username}</b></Link><small>{date(post.created_at)}{post.game ? ` · ${post.game.title}` : ""}{post.edited_at ? ` · editado ${date(post.edited_at)}` : ""}</small></div><span className="tag">{communityTypeLabel(post.type)}</span></div>
      <h1>{post.title}</h1>
      {post.has_spoiler ? <details className="spoilerBlock detailSpoiler"><summary><MaterialIcon name="warning" size={18}/>Esta publicación contiene spoilers · Mostrar contenido</summary><div className="communityLongText">{post.body.split(/\n+/).map((line: string, i: number)=><p key={i}>{line}</p>)}</div>{post.image_url&&<img className="communityDetailImage" src={post.image_url} alt="Contenido con spoiler"/>}</details> : <><div className="communityLongText">{post.body.split(/\n+/).map((line: string, i: number)=><p key={i}>{line}</p>)}</div>{post.image_url&&<img className="communityDetailImage" src={post.image_url} alt="Imagen compartida por el usuario"/>}</>}
      <div className="communityActions detailActions">
        <form action={toggleCommunityVote}><input type="hidden" name="post_id" value={post.id}/><input type="hidden" name="return_to" value={`/comunidad/${post.id}`}/><button className={post.votedByMe?"voteBtn active":"voteBtn"}><MaterialIcon name="arrow_upward" size={17}/>{post.vote_count} votos</button></form>
        <span className="inlineIconText"><MaterialIcon name="chat_bubble" size={16}/>{post.comment_count} comentarios</span>
        {userId ? <Link className="reportLink" href={`/comunidad/${post.id}/denunciar`}>Denunciar</Link> : <Link className="reportLink" href={`/auth/login?next=/comunidad/${post.id}`}>Entrar para participar</Link>}
        {isOwner && <Link className="editTextLink" href={`/comunidad/${post.id}/editar`}>Editar</Link>}
        {isOwner && <form action={deleteCommunityPost}><input type="hidden" name="post_id" value={post.id}/><button className="dangerTextBtn">Eliminar publicación</button></form>}
      </div>
    </article>
    <section id="comentarios" className="commentsSection">
      <div className="sectionTitle"><h2>Comentarios</h2><span>{post.comment_count}</span></div>
      {userId ? <form action={createCommunityComment} className="panel commentComposer"><input type="hidden" name="post_id" value={post.id}/><textarea name="body" required minLength={2} maxLength={2000} rows={4} placeholder="Escribe un comentario…"/><div><small>Máximo 2.000 caracteres · se aplican las normas de NIVOX.</small><button className="primaryBtn">Comentar</button></div></form> : <div className="panel emptyState"><h3>Únete a la conversación</h3><p>Necesitas una cuenta para comentar o votar.</p><Link className="primaryBtn inlineBtn" href={`/auth/login?next=/comunidad/${post.id}`}>Iniciar sesión</Link></div>}
      <div className="commentList">{comments.map((comment)=><article id={`comentario-${comment.id}`} className={`panel commentCard ${comment.parent_comment_id?"replyComment":""}`} key={comment.id}>
        {comment.parentAuthor&&<div className="replyContext"><MaterialIcon name="subdirectory_arrow_right" size={16}/>Respuesta a <Link href={`/usuarios/${comment.parentAuthor.username}`}>@{comment.parentAuthor.username}</Link></div>}
        <div className="postUser"><span className="avatar small">{comment.author.username.slice(0,1).toUpperCase()}</span><div><Link className="authorLink" href={`/usuarios/${comment.author.username}`}><b>@{comment.author.username}</b></Link><small>{date(comment.created_at)}{comment.edited_at?" · editado":""}</small></div></div>
        <p>{comment.body}</p>
        <div className="commentActions">
          {userId&&<details className="replyDetails"><summary>Responder</summary><form action={createCommunityComment} className="replyComposer"><input type="hidden" name="post_id" value={post.id}/><input type="hidden" name="parent_comment_id" value={comment.id}/><textarea name="body" required minLength={2} maxLength={2000} rows={3} placeholder={`Responder a @${comment.author.username}…`}/><button className="primaryBtn compactBtn">Enviar respuesta</button></form></details>}
          {userId===comment.author_id&&<details className="replyDetails"><summary>Editar</summary><form action={updateCommunityComment} className="replyComposer"><input type="hidden" name="comment_id" value={comment.id}/><input type="hidden" name="post_id" value={post.id}/><textarea name="body" required minLength={2} maxLength={2000} rows={3} defaultValue={comment.body}/><button className="primaryBtn compactBtn">Guardar</button></form></details>}
          {userId&&<Link href={`/comunidad/${post.id}/denunciar?type=comment&content=${comment.id}`}>Denunciar</Link>}
          {userId===comment.author_id&&<form action={deleteCommunityComment}><input type="hidden" name="comment_id" value={comment.id}/><input type="hidden" name="post_id" value={post.id}/><button>Eliminar</button></form>}
        </div>
      </article>)}</div>
    </section>
  </div>;
}
