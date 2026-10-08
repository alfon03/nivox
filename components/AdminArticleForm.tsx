import Link from "next/link";

type ArticleValue = {
  id?: string;
  title?: string | null;
  slug?: string | null;
  category?: string | null;
  game_slug?: string | null;
  excerpt?: string | null;
  body?: string | null;
  cover_url?: string | null;
  status?: string | null;
};

type GameOption = { slug: string; title: string };

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  value?: ArticleValue;
  games: GameOption[];
  submitLabel: string;
};

export function AdminArticleForm({ action, value, games, submitLabel }: Props) {
  return (
    <form action={action} className="adminForm panel">
      {value?.id && <input type="hidden" name="id" value={value.id} />}
      <div className="adminFormGrid two">
        <label>Título<input name="title" required maxLength={140} defaultValue={value?.title ?? ""} /></label>
        <label>Categoría<input name="category" required maxLength={40} defaultValue={value?.category ?? "Actualidad"} /></label>
      </div>
      <div className="adminFormGrid two">
        <label>Juego asociado<select name="game_slug" defaultValue={value?.game_slug ?? ""}><option value="">Noticia general</option>{games.map((game) => <option key={game.slug} value={game.slug}>{game.title}</option>)}</select><span className="fieldHint">Los seguidores del juego recibirán un aviso al publicarla.</span></label>
        <label>Slug <span className="fieldHint">URL amigable</span><input name="slug" maxLength={90} defaultValue={value?.slug ?? ""} placeholder="Se genera desde el título" /></label>
      </div>
      <label>Resumen<textarea name="excerpt" required maxLength={320} rows={3} defaultValue={value?.excerpt ?? ""} /></label>
      <label>Contenido<textarea name="body" required maxLength={30000} rows={16} defaultValue={value?.body ?? ""} /></label>
      <label>Imagen de portada (URL)<input type="url" name="cover_url" defaultValue={value?.cover_url ?? ""} placeholder="https://..." /></label>
      <div className="adminFormGrid two">
        <label>Estado<select name="status" defaultValue={value?.status ?? "draft"}><option value="draft">Borrador</option><option value="published">Publicado</option></select></label>
        <div className="adminFormActions"><button className="primaryBtn" type="submit">{submitLabel}</button><Link className="ghostBtn inlineBtn" href="/admin/noticias">Cancelar</Link></div>
      </div>
    </form>
  );
}
