import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Crear cuenta" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <div className="shell authShell">
      <section className="authCard panel">
        <span className="eyebrow">ÚNETE A LA COMUNIDAD</span>
        <h1>Crea tu NIVOX</h1>
        <p className="lead">Tu perfil, tus juegos, tu wishlist y tu progreso en un solo sitio.</p>
        {!configured && <div className="notice warning">Supabase todavía no está conectado. Sigue el README antes de registrarte.</div>}
        {params.error && <div className="notice error">{params.error}</div>}
        <form action={signup} className="authForm">
          <label>
            Nombre de usuario
            <span className="fieldHint">3–20 caracteres · letras, números y _ · único</span>
            <input name="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" autoComplete="username" placeholder="Ej. alfon_nivox" />
          </label>
          <label>
            Email
            <span className="fieldHint">Tendrás que confirmarlo desde tu correo</span>
            <input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="tu@email.com" />
          </label>
          <label>
            Contraseña
            <input name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="Mínimo 8 caracteres" />
          </label>
          <button className="primaryBtn" type="submit">Crear cuenta</button>
        </form>
        <p className="microcopy">Al crear una cuenta aceptas las normas de la comunidad. No se permiten nombres, bios ni publicaciones con lenguaje ofensivo.</p>
        <p className="authSwitch">¿Ya tienes cuenta? <Link href="/auth/login">Iniciar sesión</Link></p>
      </section>
    </div>
  );
}
