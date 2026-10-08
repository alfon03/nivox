"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MaterialIcon } from "@/components/MaterialIcon";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

export function CommunityImageUpload({ initialUrl = "" }: { initialUrl?: string }) {
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [uploadedPath, setUploadedPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    if (!ACCEPTED.includes(file.type)) return setError("Formato no permitido. Usa JPG, PNG, WEBP o GIF.");
    if (file.size > MAX_SIZE) return setError("La imagen no puede superar 5 MB.");
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return setError("Inicia sesión para subir imágenes."); }
    if (uploadedPath) await supabase.storage.from("community-media").remove([uploadedPath]);
    const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("community-media").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (uploadError) { setBusy(false); return setError(uploadError.message); }
    const { data } = supabase.storage.from("community-media").getPublicUrl(path);
    setUploadedPath(path); setImageUrl(data.publicUrl); setBusy(false);
  }

  async function remove() {
    if (uploadedPath) {
      const supabase = createClient();
      await supabase.storage.from("community-media").remove([uploadedPath]);
    }
    setUploadedPath(""); setImageUrl(""); setError("");
  }

  return <div className="communityUploader">
    <input type="hidden" name="image_url" value={imageUrl} />
    {!imageUrl ? <label className="uploadDrop">
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
      <b className="uploadLabel">{busy ? <MaterialIcon name="progress_activity" size={21} /> : <MaterialIcon name="add_photo_alternate" size={21} />}{busy ? "Subiendo…" : "Añadir imagen"}</b><span>JPG, PNG, WEBP o GIF · máximo 5 MB</span>
    </label> : <div className="uploadPreview"><img src={imageUrl} alt="Vista previa" /><button type="button" className="ghostBtn" onClick={() => void remove()}><MaterialIcon name="delete" size={18}/>Quitar imagen</button></div>}
    {error && <div className="notice error">{error}</div>}
  </div>;
}
