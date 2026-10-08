import { ImageResponse } from "next/og";

export const alt = "NIVOX — Tu mundo gaming";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:"radial-gradient(circle at 70% 20%, #39206e 0%, #0a1220 46%, #050a12 100%)", color:"white", fontFamily:"Arial", position:"relative" }}>
      <div style={{ position:"absolute", inset:42, border:"1px solid rgba(255,255,255,.12)", borderRadius:34 }} />
      <div style={{ display:"flex", alignItems:"center", gap:30 }}>
        <div style={{ width:118, height:118, borderRadius:30, display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#8d5cff,#5d2bd1)", fontSize:72, fontWeight:900 }}>N</div>
        <div style={{ display:"flex", flexDirection:"column" }}><div style={{ fontSize:86, fontWeight:900, letterSpacing:-4 }}>NIVOX</div><div style={{ fontSize:30, color:"#b9c3d8" }}>Noticias · Juegos · Guías · Comunidad</div></div>
      </div>
    </div>, size
  );
}
