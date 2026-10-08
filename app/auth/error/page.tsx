import Link from "next/link";

export const metadata = { title: "Error de acceso" };

export default function AuthErrorPage() {
  return <div className="shell authShell"><section className="authCard panel centerCard"><div className="bigIcon">!</div><h1>No hemos podido confirmar el acceso</h1><p className="lead">El enlace puede haber caducado o ya haberse utilizado. Prueba a iniciar sesión o crea la cuenta de nuevo.</p><Link className="primaryBtn inlineBtn" href="/auth/login">Volver al login</Link></section></div>;
}
