import { redirect } from "next/navigation";
import { updateProfile } from "@/app/auth/actions";
import { deleteGamingAccount, saveGamingAccount } from "@/app/mi-nivox/actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { gamingPlatformLabels } from "@/lib/gamer-profile";
import { BrandIcon } from "@/components/BrandIcon";
import { MaterialIcon } from "@/components/MaterialIcon";

export const metadata = { title: "Editar perfil" };

type Props = { searchParams: Promise<{ error?: string; message?: string }> };
const platforms = ["psn","xbox","steam","nintendo","epic","discord","riot","battlenet","twitch"];

export default async function EditProfilePage({ searchParams }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/login");
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/perfil/editar");

  const [{ data: profile }, { data: accounts }] = await Promise.all([
    supabase.from("profiles").select("username,full_name,bio").eq("id", user.id).maybeSingle(),
    supabase.from("gaming_accounts").select("platform,handle,is_public").eq("user_id", user.id).order("platform"),
  ]);
  const accountMap = new Map((accounts ?? []).map((account) => [account.platform, account]));

  return (
    <div className="shell pageStack profileEditPage">
      {params.error && <div className="notice error">{params.error}</div>}
      {params.message && <div className="notice success">{params.message}</div>}
      <section className="authCard panel profileEditCard">
        <span className="eyebrow">MI PERFIL</span>
        <h1>Editar perfil</h1>
        <form action={updateProfile} className="authForm">
          <label>Nombre de usuario <span className="fieldHint">único · letras, números y _</span><input name="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" defaultValue={profile?.username ?? ""} /></label>
          <label>Nombre visible <span className="fieldHint">opcional</span><input name="full_name" maxLength={80} defaultValue={profile?.full_name ?? ""} /></label>
          <label>Bio <span className="fieldHint">máx. 280 caracteres</span><textarea name="bio" maxLength={280} rows={5} defaultValue={profile?.bio ?? ""} placeholder="Cuéntale a la comunidad a qué juegas..." /></label>
          <p className="microcopy">El lenguaje ofensivo no está permitido en nombres ni biografías.</p>
          <button className="primaryBtn" type="submit">Guardar perfil</button>
        </form>
      </section>

      <section className="panel gamingAccountsPanel">
        <div className="sectionTitle"><div><span className="eyebrow">CONTACTO GAMER</span><h2>Mis plataformas</h2></div><span>Opcional</span></div>
        <p className="lead">Añade tus identificadores para que otros jugadores puedan encontrarte. NIVOX nunca te pedirá contraseñas de estas plataformas.</p>
        <div className="gamingAccountGrid">
          {platforms.map((platform) => {
            const current = accountMap.get(platform);
            return <div className="gamingAccountEditor" key={platform}>
              <form action={saveGamingAccount}>
                <input type="hidden" name="platform" value={platform}/><input type="hidden" name="return_to" value="/perfil/editar"/>
                <div className="platformLabel"><BrandIcon platform={platform} size={23}/><b>{gamingPlatformLabels[platform]}</b></div>
                <input name="handle" minLength={2} maxLength={80} required defaultValue={current?.handle ?? ""} placeholder={platform === "nintendo" ? "SW-0000-0000-0000" : "Tu usuario / ID"}/>
                <label className="miniPrivacy"><input name="is_public" type="checkbox" defaultChecked={current?.is_public ?? true}/> Mostrar en mi perfil</label>
                <button className="ghostBtn" type="submit">{current ? "Actualizar" : "Añadir"}</button>
              </form>
              {current && <form action={deleteGamingAccount}><input type="hidden" name="platform" value={platform}/><input type="hidden" name="return_to" value="/perfil/editar"/><button className="dangerTextBtn" type="submit">Quitar</button></form>}
            </div>;
          })}
        </div>
        <div className="historyPrivacyNote"><MaterialIcon name="lock" size={18}/> <span>Solo se muestran públicamente las cuentas que marques como visibles. No publiques datos que no quieras compartir con desconocidos.</span></div>
      </section>
    </div>
  );
}
