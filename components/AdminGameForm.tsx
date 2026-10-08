import Link from "next/link";

type GameValue = {
  slug?: string | null;
  title?: string | null;
  genre?: string | null;
  platform?: string | null;
  score?: number | null;
  accent?: string | null;
  description?: string | null;
  release_date?: string | null;
  developer?: string | null;
  publisher?: string | null;
  cover_url?: string | null;
  status?: string | null;
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  value?: GameValue;
  submitLabel: string;
  editing?: boolean;
};

export function AdminGameForm({ action, value, submitLabel, editing = false }: Props) {
  return (
    <form action={action} className="adminForm panel">
      {editing && <input type="hidden" name="original_slug" value={value?.slug ?? ""} />}
      <div className="adminFormGrid two">
        <label>Nombre<input name="title" required maxLength={120} defaultValue={value?.title ?? ""} /></label>
        <label>Slug<input name="slug" required maxLength={90} defaultValue={value?.slug ?? ""} /></label>
      </div>
      <div className="adminFormGrid two">
        <label>Género<input name="genre" maxLength={80} defaultValue={value?.genre ?? ""} /></label>
        <label>Plataformas<input name="platform" maxLength={120} defaultValue={value?.platform ?? ""} placeholder="PC · PS5 · Xbox" /></label>
      </div>
      <label>Descripción<textarea name="description" maxLength={1200} rows={5} defaultValue={value?.description ?? ""} /></label>
      <div className="adminFormGrid three">
        <label>Nota<input name="score" inputMode="decimal" placeholder="9.2" defaultValue={value?.score ?? ""} /></label>
        <label>Fecha de lanzamiento<input type="date" name="release_date" defaultValue={value?.release_date ?? ""} /></label>
        <label>Estilo visual<select name="accent" defaultValue={value?.accent ?? "sunset"}><option value="sunset">Sunset</option><option value="gold">Gold</option><option value="sky">Sky</option><option value="ember">Ember</option><option value="crimson">Crimson</option></select></label>
      </div>
      <div className="adminFormGrid two">
        <label>Desarrolladora<input name="developer" maxLength={100} defaultValue={value?.developer ?? ""} /></label>
        <label>Editora<input name="publisher" maxLength={100} defaultValue={value?.publisher ?? ""} /></label>
      </div>
      <div className="adminCoverFields"><label>Subir portada<input type="file" name="cover_file" accept="image/jpeg,image/png,image/webp" /><small>JPG, PNG o WEBP · máximo 5 MB. Si subes una imagen, tendrá prioridad sobre la URL.</small></label><label>Imagen (URL alternativa)<input type="url" name="cover_url" defaultValue={value?.cover_url ?? ""} placeholder="https://..." /></label>{value?.cover_url && <img className="adminCoverPreview" src={value.cover_url} alt="Portada actual" />}</div>
      <div className="adminFormGrid two">
        <label>Estado<select name="status" defaultValue={value?.status ?? "published"}><option value="draft">Borrador</option><option value="published">Publicado</option></select></label>
        <div className="adminFormActions"><button className="primaryBtn" type="submit">{submitLabel}</button><Link className="ghostBtn inlineBtn" href="/admin/juegos">Cancelar</Link></div>
      </div>
    </form>
  );
}
