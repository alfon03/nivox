import Link from "next/link";

type GuideValue = {
  id?: string;
  title?: string | null;
  slug?: string | null;
  game_slug?: string | null;
  summary?: string | null;
  body?: string | null;
  cover_url?: string | null;
  status?: string | null;
};

type GameOption = { slug: string; title: string };

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  value?: GuideValue;
  games: GameOption[];
  submitLabel: string;
};

export function AdminGuideForm({ action, value, games, submitLabel }: Props) {
  return (
    <form action={action} className="adminForm panel">
      <div className="adminFormGrid two">
        <label>Título<input name="title" required maxLength={140} defaultValue={value?.title ?? ""} /></label>
        <label>Juego<select name="game_slug" defaultValue={value?.game_slug ?? ""}><option value="">Sin juego asociado</option>{games.map(g => <option key={g.slug} value={g.slug}>{g.title}</option>)}</select></label>
      </div>
      <label>Slug<input name="slug" maxLength={90} defaultValue={value?.slug ?? ""} placeholder="Se genera desde el título" /></label>
      <label>Resumen<textarea name="summary" required maxLength={320} rows={3} defaultValue={value?.summary ?? ""} /></label>
      <label>Contenido<textarea name="body" required maxLength={30000} rows={16} defaultValue={value?.body ?? ""} /></label>
      <label>Imagen de portada (URL)<input type="url" name="cover_url" defaultValue={value?.cover_url ?? ""} placeholder="https://..." /></label>
      <div className="adminFormGrid two">
        <label>Estado<select name="status" defaultValue={value?.status ?? "draft"}><option value="draft">Borrador</option><option value="published">Publicado</option></select></label>
        <div className="adminFormActions"><button className="primaryBtn" type="submit">{submitLabel}</button><Link className="ghostBtn inlineBtn" href="/admin/guias">Cancelar</Link></div>
      </div>
    </form>
  );
}
