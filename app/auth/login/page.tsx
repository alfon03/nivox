import Link from "next/link";
import { login } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Iniciar sesión" };

type Props = { searchParams: Promise<{ error?: string; message?: string; next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <div className="shell authShell">
      <section className="authCard panel">
        <span className="eyebrow">TU CUENTA NIVOX</span>
        <h1>Bienvenido de nuevo</h1>
        <p className="lead">Entra para guardar tu biblioteca y continuar desde cualquier dispositivo.</p>
        {!configured && <div className="notice warning">Supabase todavía no está conectado. Sigue el README antes de registrarte.</div>}
        {params.error && <div className="notice error">{params.error}</div>}
        {params.message && <div className="notice success">{params.message}</div>}
        <form action={login} className="authForm">
          <input type="hidden" name="next" value={params.next ?? "/mi-nivox"} />
          <label>Email<input name="email" type="email" autoComplete="email" required placeholder="tu@email.com" /></label>
          <label>Contraseña<input name="password" type="password" autoComplete="current-password" required minLength={8} placeholder="••••••••" /></label>
          <button className="primaryBtn" type="submit">Entrar en NIVOX</button>
        </form>
        <p className="authSwitch"><Link href="/auth/recuperar">¿Has olvidado tu contraseña?</Link></p>
        <p className="authSwitch">¿Todavía no tienes cuenta? <Link href="/auth/registro">Crear cuenta</Link></p>
      </section>
    </div>
  );
}
