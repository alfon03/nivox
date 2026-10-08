import Link from "next/link";
import { notFound } from "next/navigation";
import { reportCommunityContent } from "@/app/comunidad/actions";
import { requireUser } from "@/lib/auth";
import { fetchCommunityPost, isUuid } from "@/lib/community";
import { MaterialIcon } from "@/components/MaterialIcon";

type Params = Promise<{ id: string }>;
type Search = Promise<{ type?: string; content?: string; error?: string }>;

export default async function ReportPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { id } = await params;
  const query = await searchParams;
  await requireUser(`/comunidad/${id}/denunciar`);
  const data = await fetchCommunityPost(id);
  if (!data) notFound();
  const isComment = query.type === "comment" && query.content && isUuid(query.content);
  const contentType = isComment ? "comment" : "post";
  const contentId = isComment ? query.content! : id;
  if (isComment && !data.comments.some((comment) => comment.id === contentId)) notFound();
  return <div className="shell authShell"><section className="authCard panel"><Link className="backLink" href={`/comunidad/${id}`}><MaterialIcon name="arrow_back" size={17}/>Volver</Link><span className="eyebrow">SEGURIDAD NIVOX</span><h1>Denunciar {isComment ? "comentario" : "publicación"}</h1><p className="lead">Explícanos qué incumple las normas. Un administrador podrá revisar el contenido desde la cola de moderación.</p>{query.error && <div className="notice error">{query.error}</div>}<form action={reportCommunityContent} className="authForm"><input type="hidden" name="content_type" value={contentType}/><input type="hidden" name="content_id" value={contentId}/><input type="hidden" name="post_id" value={id}/><label>Motivo<textarea name="reason" required minLength={3} maxLength={500} rows={6} placeholder="Spam, insultos, contenido inapropiado, derechos de autor…"/></label><button className="primaryBtn" type="submit">Enviar denuncia</button></form></section></div>;
}
