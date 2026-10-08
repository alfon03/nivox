import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/mi-nivox/", "/notificaciones/", "/perfil/editar/", "/auth/"] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
