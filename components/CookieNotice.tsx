"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/MaterialIcon";

const STORAGE_KEY = "nivox-cookie-notice-v1";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(localStorage.getItem(STORAGE_KEY) !== "seen"); }, []);
  if (!visible) return null;
  return <aside className="cookieNotice" role="status" aria-label="Información sobre cookies">
    <div><MaterialIcon name="cookie" size={22}/><p><b>Cookies técnicas.</b> NIVOX usa cookies necesarias para iniciar sesión y mantener tu cuenta. No cargamos analítica ni publicidad opcional en esta versión. <Link href="/cookies">Más información</Link>.</p></div>
    <button type="button" className="ghostBtn inlineBtn" onClick={() => { localStorage.setItem(STORAGE_KEY, "seen"); setVisible(false); }}>Entendido</button>
  </aside>;
}
