import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
export const metadata = { title: "Recuperar contraseña" };
type Props = { searchParams: Promise<{ error?: string; message?: string }> };
export default async function Page({searchParams}:Props){ const p=await searchParams; return <div className="shell authShell"><section className="authCard panel"><span className="eyebrow">SEGURIDAD</span><h1>Recuperar contraseña</h1><p className="lead">Te enviaremos un enlace de recuperación si el correo pertenece a una cuenta.</p>{p.error&&<div className="notice error">{p.error}</div>}{p.message&&<div className="notice success">{p.message}</div>}<form action={requestPasswordReset} className="authForm"><label>Email<input name="email" type="email" autoComplete="email" required/></label><button className="primaryBtn">Enviar enlace</button></form><p className="authSwitch"><Link href="/auth/login">Volver a iniciar sesión</Link></p></section></div>; }
