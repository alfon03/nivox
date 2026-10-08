import Link from "next/link";
import { MaterialIcon } from "@/components/MaterialIcon";

export const metadata = { title: "Confirma tu email" };

export default function CheckEmailPage() {
  return <div className="shell authShell"><section className="authCard panel centerCard"><div className="bigIcon"><MaterialIcon name="mark_email_read" size={31}/></div><span className="eyebrow">CASI ESTÁ</span><h1>Confirma tu email</h1><p className="lead">Te hemos enviado un enlace de confirmación. Después vuelve a NIVOX e inicia sesión.</p><Link className="primaryBtn inlineBtn" href="/auth/login"><MaterialIcon name="login" size={18}/>Ir a iniciar sesión</Link></section></div>;
}
