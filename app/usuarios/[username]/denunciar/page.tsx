import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { reportCommunityContent } from "@/app/comunidad/actions";
import { createClient } from "@/lib/supabase/server";
import { MaterialIcon } from "@/components/MaterialIcon";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ error?: string }> };

export default async function ReportProfilePage({ params, searchParams }: Props) {
  const { username } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/usuarios/${encodeURIComponent(username)}/denunciar`);
  const { data: profile } = await supabase.from("profiles").select("id,username").eq("username", decodeURIComponent(username).toLowerCase()).maybeSingle();
  if (!profile) notFound();
  if (profile.id === user.id) redirect(`/usuarios/${profile.username}`);

  return <div className="shell authShell"><section className="panel authCard"><Link className="backLink" href={`/usuarios/${profile.username}`}><MaterialIcon name="arrow_back" size={17}/>Volver al perfil</Link><span className="eyebrow">SEGURIDAD</span><h1>Denunciar @{profile.username}</h1>{query.error && <div className="notice error">{query.error}</div>}<form action={reportCommunityContent} className="authForm"><input type="hidden" name="content_type" value="profile"/><input type="hidden" name="content_id" value={profile.id}/><input type="hidden" name="return_to" value={`/usuarios/${profile.username}`}/><label>Motivo<textarea name="reason" required minLength={3} maxLength={500} rows={5} placeholder="Explica qué norma crees que incumple este perfil…"/></label><button className="primaryBtn" type="submit">Enviar denuncia</button></form></section></div>;
}
