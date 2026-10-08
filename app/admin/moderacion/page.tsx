import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/AdminNav";
import { moderateCommunityReport } from "@/app/admin/actions";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default async function ModeracionPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase } = await requireAdmin("/admin/moderacion");
  const { data: reports } = await supabase.from("content_reports").select("id,content_type,content_id,reason,status,created_at,reporter_id").order("created_at", { ascending: false }).limit(100);
  const rows = reports ?? [];
  const postIds = rows.filter((r) => r.content_type === "post").map((r) => r.content_id);
  const commentIds = rows.filter((r) => r.content_type === "comment").map((r) => r.content_id);
  const profileIds = rows.filter((r) => r.content_type === "profile").map((r) => r.content_id);
  const reviewIds = rows.filter((r) => r.content_type === "review").map((r) => r.content_id);
  const [{ data: posts }, { data: comments }, { data: profiles }, { data: reviews }] = await Promise.all([
    postIds.length ? supabase.from("community_posts").select("id,title,body,status").in("id", postIds) : Promise.resolve({ data: [] as { id:string; title:string; body:string; status:string }[] }),
    commentIds.length ? supabase.from("community_comments").select("id,body,status,post_id").in("id", commentIds) : Promise.resolve({ data: [] as { id:string; body:string; status:string; post_id:string }[] }),
    profileIds.length ? supabase.from("profiles").select("id,username,full_name,bio,role").in("id", profileIds) : Promise.resolve({ data: [] as { id:string; username:string; full_name:string|null; bio:string|null; role:string }[] }),
    reviewIds.length ? supabase.from("game_reviews").select("id,game_slug,score,body,status").in("id", reviewIds) : Promise.resolve({ data: [] as { id:string; game_slug:string; score:number; body:string; status:string }[] }),
  ]);
  const postMap = new Map((posts ?? []).map((p) => [p.id, p]));
  const commentMap = new Map((comments ?? []).map((c) => [c.id, c]));
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const reviewMap = new Map((reviews ?? []).map((review) => [review.id, review]));

  return <div className="shell pageStack">
    <section className="adminTitleRow"><div><span className="eyebrow">SEGURIDAD</span><h1>Moderación</h1><p className="muted">Revisa denuncias de publicaciones, comentarios, perfiles y reseñas de la comunidad.</p></div></section>
    <AdminNav />
    {params.error && <div className="notice error">{params.error}</div>}
    {params.message && <div className="notice success">{params.message}</div>}
    <section className="panel adminTableWrap"><table className="adminTable moderationTable"><thead><tr><th>Contenido</th><th>Motivo</th><th>Estado</th><th>Fecha</th><th></th></tr></thead><tbody>{rows.map((r) => {
      const post = r.content_type === "post" ? postMap.get(r.content_id) : null;
      const comment = r.content_type === "comment" ? commentMap.get(r.content_id) : null;
      const profile = r.content_type === "profile" ? profileMap.get(r.content_id) : null;
      const review = r.content_type === "review" ? reviewMap.get(r.content_id) : null;
      const preview = post ? `${post.title} — ${post.body}` : comment?.body ?? (profile ? `@${profile.username} — ${profile.bio ?? profile.full_name ?? "Sin bio"}` : review ? `${review.game_slug} · ${review.score}/10 — ${review.body}` : r.content_id);
      const canHide = r.content_type === "post" || r.content_type === "comment" || r.content_type === "review";
      return <tr key={r.id}><td><strong>{r.content_type}</strong><small className="moderationPreview">{preview.slice(0,180)}{preview.length > 180 ? "…" : ""}</small></td><td>{r.reason}</td><td><span className={`statusBadge ${r.status}`}>{r.status}</span></td><td>{new Date(r.created_at).toLocaleDateString("es-ES")}</td><td className="tableActions">{r.status === "open" ? <>{canHide && <form action={moderateCommunityReport}><input type="hidden" name="id" value={r.id}/><input type="hidden" name="decision" value="hide"/><button className="dangerAction" type="submit">Ocultar + resolver</button></form>}<form action={moderateCommunityReport}><input type="hidden" name="id" value={r.id}/><input type="hidden" name="decision" value="resolve"/><button type="submit">Resolver</button></form><form action={moderateCommunityReport}><input type="hidden" name="id" value={r.id}/><input type="hidden" name="decision" value="dismiss"/><button type="submit">Descartar</button></form></> : "—"}</td></tr>;
    })}{!rows.length && <tr><td colSpan={5}><div className="emptyState"><h3>Sin reportes pendientes</h3><p>La cola está limpia.</p></div></td></tr>}</tbody></table></section>
  </div>;
}
