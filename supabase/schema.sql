-- NIVOX v0.5 — esquema completo para instalaciones nuevas.
-- Incluye autenticación/perfiles, editorial/admin y comunidad real hasta v0.5.

-- NIVOX v0.3 — esquema completo para instalaciones nuevas.
-- Si ya ejecutaste v0.2, usa migrate_v0.3.sql en vez de este archivo.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  full_name text,
  bio text check (char_length(bio) <= 280),
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'admin', 'moderator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_unique_ci
on public.profiles (lower(username));

create table if not exists public.games (
  slug text primary key,
  title text not null,
  genre text,
  platform text,
  score numeric(3,1),
  accent text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_games (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_slug text not null references public.games(slug) on delete cascade,
  status text not null check (status in ('wishlist', 'playing', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_slug)
);

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.user_games enable row level security;

drop policy if exists "profiles_public_read" on public.profiles;
drop policy if exists "profiles_own_insert" on public.profiles;
drop policy if exists "profiles_own_update" on public.profiles;
drop policy if exists "games_public_read" on public.games;
drop policy if exists "user_games_own_read" on public.user_games;
drop policy if exists "user_games_own_insert" on public.user_games;
drop policy if exists "user_games_own_update" on public.user_games;
drop policy if exists "user_games_own_delete" on public.user_games;

create policy "profiles_public_read" on public.profiles for select using (true);
create policy "profiles_own_insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_own_update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "games_public_read" on public.games for select using (true);
create policy "user_games_own_read" on public.user_games for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_games_own_insert" on public.user_games for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_games_own_update" on public.user_games for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_games_own_delete" on public.user_games for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.nivox_validate_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  username_clean text := lower(trim(coalesce(new.username, '')));
  full_name_clean text := regexp_replace(translate(lower(coalesce(new.full_name, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9_]+', ' ', 'g');
  bio_clean text := regexp_replace(translate(lower(coalesce(new.bio, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9_]+', ' ', 'g');
  blocked text[] := array[
    'puta','puto','putas','putos','mierda','joder','gilipollas','cabron','cabrones','cono','polla','pollas','follar',
    'fuck','fucking','shit','bitch','asshole','cunt','maricon','maricones','subnormal'
  ];
  reserved text[] := array['admin','administrator','moderator','nivox','soporte','support','staff','oficial','official'];
  term text;
begin
  if char_length(username_clean) < 3 or char_length(username_clean) > 20 then
    raise exception using errcode = '22023', message = 'El username debe tener entre 3 y 20 caracteres';
  end if;
  if username_clean !~ '^[a-z0-9_]+$' then
    raise exception using errcode = '22023', message = 'El username contiene caracteres no permitidos';
  end if;
  if username_clean = any(reserved) then
    raise exception using errcode = '22023', message = 'Ese username está reservado';
  end if;
  foreach term in array blocked loop
    if username_clean = term
       or (' ' || full_name_clean || ' ') like ('% ' || term || ' %')
       or (' ' || bio_clean || ' ') like ('% ' || term || ' %') then
      raise exception using errcode = '22023', message = 'El perfil contiene lenguaje no permitido';
    end if;
  end loop;
  new.username := username_clean;
  return new;
end;
$$;

drop trigger if exists nivox_validate_profile_before_write on public.profiles;
create trigger nivox_validate_profile_before_write
before insert or update of username, full_name, bio on public.profiles
for each row execute function public.nivox_validate_profile();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  requested_username text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
begin
  if requested_username = '' then
    requested_username := 'user_' || substr(new.id::text, 1, 8);
  end if;
  insert into public.profiles (id, username)
  values (new.id, requested_username)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, username)
select id, coalesce(nullif(lower(trim(raw_user_meta_data ->> 'username')), ''), 'user_' || substr(id::text, 1, 8))
from auth.users
on conflict (id) do nothing;

insert into public.games (slug, title, genre, platform, score, accent, description) values
('gta-vi', 'GTA VI', 'Acción · Mundo abierto', 'PS5 · Xbox', 9.6, 'sunset', 'Vice City vuelve con una nueva historia criminal y un enorme mundo abierto.'),
('elden-ring', 'Elden Ring', 'RPG · Acción', 'PC · PS · Xbox', 9.5, 'gold', 'Exploración, jefes y construcción de personajes en un mundo oscuro.'),
('zelda-totk', 'Zelda: TotK', 'Aventura', 'Nintendo', 9.3, 'sky', 'Explora Hyrule, sus cielos y profundidades con libertad total.'),
('baldurs-gate-3', 'Baldur''s Gate 3', 'RPG', 'PC · PS5 · Xbox', 9.6, 'ember', 'Decisiones, personajes y combates tácticos en una aventura gigantesca.'),
('silksong', 'Hollow Knight: Silksong', 'Metroidvania', 'Multiplataforma', 9.1, 'crimson', 'Explora un reino de insectos, secretos y combates precisos.')
on conflict (slug) do update set
  title = excluded.title,
  genre = excluded.genre,
  platform = excluded.platform,
  score = excluded.score,
  accent = excluded.accent,
  description = excluded.description;

-- Para convertir TU cuenta en administradora:
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'TU_EMAIL@EJEMPLO.COM');


-- ===== NIVOX v0.4 additions =====
-- NIVOX v0.4 — administración editorial segura
-- Ejecuta UNA VEZ en Supabase > SQL Editor después de v0.3.

-- 1) Helper privado para comprobar administradores sin crear recursión RLS.
create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.is_admin() from anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

-- 2) Impide que un usuario normal se ascienda a admin modificando profiles.role.
revoke update on public.profiles from public, anon, authenticated;
grant update (username, full_name, bio, avatar_url, updated_at) on public.profiles to authenticated;

-- 3) Amplía juegos para que puedan administrarse desde NIVOX.
alter table public.games add column if not exists release_date date;
alter table public.games add column if not exists developer text;
alter table public.games add column if not exists publisher text;
alter table public.games add column if not exists cover_url text;
alter table public.games add column if not exists status text not null default 'published';

-- Permite cambiar un slug desde el panel sin romper las bibliotecas de usuarios.
alter table public.user_games drop constraint if exists user_games_game_slug_fkey;
alter table public.user_games add constraint user_games_game_slug_fkey foreign key (game_slug) references public.games(slug) on update cascade on delete restrict;

alter table public.games drop constraint if exists games_status_check;
alter table public.games add constraint games_status_check check (status in ('draft','published'));

-- Sustituimos lectura universal por lectura de publicados + acceso total de admin.
drop policy if exists "games_public_read" on public.games;
drop policy if exists "games_admin_read" on public.games;
drop policy if exists "games_admin_insert" on public.games;
drop policy if exists "games_admin_update" on public.games;
drop policy if exists "games_admin_delete" on public.games;

create policy "games_public_read" on public.games
for select to anon, authenticated
using (status = 'published');

create policy "games_admin_read" on public.games
for select to authenticated
using ((select private.is_admin()));

create policy "games_admin_insert" on public.games
for insert to authenticated
with check ((select private.is_admin()));

create policy "games_admin_update" on public.games
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "games_admin_delete" on public.games
for delete to authenticated
using ((select private.is_admin()));

-- 4) Noticias.
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  category text not null default 'Actualidad',
  excerpt text not null,
  body text not null,
  cover_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  author_id uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists articles_slug_unique_ci on public.articles (lower(slug));
create index if not exists articles_status_published_idx on public.articles(status, published_at desc);
alter table public.articles enable row level security;

drop policy if exists "articles_public_read" on public.articles;
drop policy if exists "articles_admin_read" on public.articles;
drop policy if exists "articles_admin_insert" on public.articles;
drop policy if exists "articles_admin_update" on public.articles;
drop policy if exists "articles_admin_delete" on public.articles;

create policy "articles_public_read" on public.articles
for select to anon, authenticated
using (status = 'published');
create policy "articles_admin_read" on public.articles
for select to authenticated using ((select private.is_admin()));
create policy "articles_admin_insert" on public.articles
for insert to authenticated with check ((select private.is_admin()));
create policy "articles_admin_update" on public.articles
for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "articles_admin_delete" on public.articles
for delete to authenticated using ((select private.is_admin()));

-- 5) Guías.
create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  game_slug text references public.games(slug) on update cascade on delete set null,
  summary text not null,
  body text not null,
  cover_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  author_id uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists guides_slug_unique_ci on public.guides (lower(slug));
create index if not exists guides_status_published_idx on public.guides(status, published_at desc);
alter table public.guides enable row level security;

drop policy if exists "guides_public_read" on public.guides;
drop policy if exists "guides_admin_read" on public.guides;
drop policy if exists "guides_admin_insert" on public.guides;
drop policy if exists "guides_admin_update" on public.guides;
drop policy if exists "guides_admin_delete" on public.guides;

create policy "guides_public_read" on public.guides
for select to anon, authenticated
using (status = 'published');
create policy "guides_admin_read" on public.guides
for select to authenticated using ((select private.is_admin()));
create policy "guides_admin_insert" on public.guides
for insert to authenticated with check ((select private.is_admin()));
create policy "guides_admin_update" on public.guides
for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "guides_admin_delete" on public.guides
for delete to authenticated using ((select private.is_admin()));

-- 6) Cola de moderación. En v0.5 la comunidad generará estos reportes desde la web.
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  content_type text not null check (content_type in ('post','comment','profile','image','other')),
  content_id text not null,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists content_reports_status_idx on public.content_reports(status, created_at desc);
alter table public.content_reports enable row level security;

drop policy if exists "reports_own_insert" on public.content_reports;
drop policy if exists "reports_admin_read" on public.content_reports;
drop policy if exists "reports_admin_update" on public.content_reports;

create policy "reports_own_insert" on public.content_reports
for insert to authenticated with check ((select auth.uid()) = reporter_id);
create policy "reports_admin_read" on public.content_reports
for select to authenticated using ((select private.is_admin()));
create policy "reports_admin_update" on public.content_reports
for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- 7) Moderación de lenguaje en contenido editorial, además de la validación del servidor.
create or replace function public.nivox_validate_editorial_content()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  txt text := regexp_replace(translate(lower(concat_ws(' ',
    coalesce(to_jsonb(new)->>'title',''),
    coalesce(to_jsonb(new)->>'excerpt',''),
    coalesce(to_jsonb(new)->>'summary',''),
    coalesce(to_jsonb(new)->>'body',''),
    coalesce(to_jsonb(new)->>'description','')
  )), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9_]+', ' ', 'g');
  blocked text[] := array[
    'puta','puto','putas','putos','mierda','joder','gilipollas','cabron','cabrones','cono','polla','pollas','follar',
    'fuck','fucking','shit','bitch','asshole','cunt','maricon','maricones','subnormal'
  ];
  term text;
begin
  foreach term in array blocked loop
    if (' ' || txt || ' ') like ('% ' || term || ' %') then
      raise exception using errcode = '22023', message = 'El contenido contiene lenguaje no permitido';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists nivox_validate_articles_before_write on public.articles;
create trigger nivox_validate_articles_before_write
before insert or update of title, excerpt, body on public.articles
for each row execute function public.nivox_validate_editorial_content();

drop trigger if exists nivox_validate_guides_before_write on public.guides;
create trigger nivox_validate_guides_before_write
before insert or update of title, summary, body on public.guides
for each row execute function public.nivox_validate_editorial_content();

drop trigger if exists nivox_validate_games_before_write on public.games;
create trigger nivox_validate_games_before_write
before insert or update of title, description on public.games
for each row execute function public.nivox_validate_editorial_content();

-- 8) Grants explícitos para las tablas nuevas.
grant select on public.articles, public.guides, public.games to anon, authenticated;
grant insert, update, delete on public.articles, public.guides, public.games to authenticated;
grant select, update on public.content_reports to authenticated;
grant insert on public.content_reports to authenticated;

-- 9) Convierte tu cuenta actual en admin reemplazando el correo y ejecutando SOLO esta línea:
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'TU_EMAIL@EJEMPLO.COM');


-- ===== NIVOX v0.5 additions =====
-- NIVOX v0.5 — Comunidad real
-- Ejecuta UNA VEZ después de haber aplicado v0.4.

-- 1) Publicaciones de comunidad
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 140),
  body text not null check (char_length(body) between 10 and 5000),
  type text not null default 'debate' check (type in ('debate','pregunta','teoria','captura','coleccion')),
  game_slug text references public.games(slug) on update cascade on delete set null,
  image_url text,
  status text not null default 'published' check (status in ('published','hidden')),
  vote_count integer not null default 0 check (vote_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_posts_status_created_idx on public.community_posts(status, created_at desc);
create index if not exists community_posts_type_created_idx on public.community_posts(type, created_at desc);
create index if not exists community_posts_game_created_idx on public.community_posts(game_slug, created_at desc);
alter table public.community_posts enable row level security;

-- 2) Comentarios
create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 2 and 2000),
  status text not null default 'published' check (status in ('published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_comments_post_created_idx on public.community_comments(post_id, created_at asc);
create index if not exists community_comments_status_idx on public.community_comments(status, created_at desc);
alter table public.community_comments enable row level security;

-- 3) Votos positivos (un voto por usuario/publicación)
create table if not exists public.community_votes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.community_votes enable row level security;

-- 4) Políticas de publicaciones

drop policy if exists "community_posts_public_read" on public.community_posts;
drop policy if exists "community_posts_own_read" on public.community_posts;
drop policy if exists "community_posts_own_insert" on public.community_posts;
drop policy if exists "community_posts_own_update" on public.community_posts;
drop policy if exists "community_posts_own_delete" on public.community_posts;
drop policy if exists "community_posts_admin_read" on public.community_posts;
drop policy if exists "community_posts_admin_update" on public.community_posts;
drop policy if exists "community_posts_admin_delete" on public.community_posts;

create policy "community_posts_public_read" on public.community_posts
for select to anon, authenticated using (status = 'published');
create policy "community_posts_own_read" on public.community_posts
for select to authenticated using ((select auth.uid()) = author_id);
create policy "community_posts_own_insert" on public.community_posts
for insert to authenticated with check ((select auth.uid()) = author_id and status = 'published');
create policy "community_posts_own_update" on public.community_posts
for update to authenticated using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create policy "community_posts_own_delete" on public.community_posts
for delete to authenticated using ((select auth.uid()) = author_id);
create policy "community_posts_admin_read" on public.community_posts
for select to authenticated using ((select private.is_admin()));
create policy "community_posts_admin_update" on public.community_posts
for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "community_posts_admin_delete" on public.community_posts
for delete to authenticated using ((select private.is_admin()));

-- 5) Políticas de comentarios

drop policy if exists "community_comments_public_read" on public.community_comments;
drop policy if exists "community_comments_own_read" on public.community_comments;
drop policy if exists "community_comments_own_insert" on public.community_comments;
drop policy if exists "community_comments_own_update" on public.community_comments;
drop policy if exists "community_comments_own_delete" on public.community_comments;
drop policy if exists "community_comments_admin_read" on public.community_comments;
drop policy if exists "community_comments_admin_update" on public.community_comments;
drop policy if exists "community_comments_admin_delete" on public.community_comments;

create policy "community_comments_public_read" on public.community_comments
for select to anon, authenticated using (
  status = 'published'
  and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published')
);
create policy "community_comments_own_read" on public.community_comments
for select to authenticated using ((select auth.uid()) = author_id);
create policy "community_comments_own_insert" on public.community_comments
for insert to authenticated with check (
  (select auth.uid()) = author_id
  and status = 'published'
  and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published')
);
create policy "community_comments_own_update" on public.community_comments
for update to authenticated using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create policy "community_comments_own_delete" on public.community_comments
for delete to authenticated using ((select auth.uid()) = author_id);
create policy "community_comments_admin_read" on public.community_comments
for select to authenticated using ((select private.is_admin()));
create policy "community_comments_admin_update" on public.community_comments
for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "community_comments_admin_delete" on public.community_comments
for delete to authenticated using ((select private.is_admin()));

-- 6) Políticas de votos: cada usuario solo ve y gestiona sus propios votos.
drop policy if exists "community_votes_own_read" on public.community_votes;
drop policy if exists "community_votes_own_insert" on public.community_votes;
drop policy if exists "community_votes_own_delete" on public.community_votes;
create policy "community_votes_own_read" on public.community_votes
for select to authenticated using ((select auth.uid()) = user_id);
create policy "community_votes_own_insert" on public.community_votes
for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published')
);
create policy "community_votes_own_delete" on public.community_votes
for delete to authenticated using ((select auth.uid()) = user_id);

-- 7) Segunda barrera contra lenguaje ofensivo y cambios de estado no autorizados.
create or replace function public.nivox_validate_community_content()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  txt text := regexp_replace(
    translate(lower(concat_ws(' ', coalesce(to_jsonb(new)->>'title',''), coalesce(to_jsonb(new)->>'body',''), coalesce(to_jsonb(new)->>'reason',''))), 'áéíóúüñ', 'aeiouun'),
    '[^a-z0-9_]+', ' ', 'g'
  );
  blocked text[] := array[
    'puta','puto','putas','putos','mierda','joder','gilipollas','cabron','cabrones','cono','polla','pollas','follar',
    'fuck','fucking','shit','bitch','asshole','cunt','maricon','maricones','subnormal'
  ];
  term text;
begin
  foreach term in array blocked loop
    if (' ' || txt || ' ') like ('% ' || term || ' %') then
      raise exception using errcode = '22023', message = 'El contenido contiene lenguaje no permitido';
    end if;
  end loop;
  if tg_table_name = 'community_posts' and coalesce(to_jsonb(new)->>'image_url','') <> '' then
    if (to_jsonb(new)->>'image_url') !~ '^https://[a-z0-9.-]+\.supabase\.co/storage/v1/object/public/community-media/'
       or position('/community-media/' || (to_jsonb(new)->>'author_id') || '/' in (to_jsonb(new)->>'image_url')) = 0 then
      raise exception using errcode = '22023', message = 'La imagen de comunidad no es válida';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists nivox_validate_community_posts_before_write on public.community_posts;
create trigger nivox_validate_community_posts_before_write
before insert or update of title, body, image_url on public.community_posts
for each row execute function public.nivox_validate_community_content();

drop trigger if exists nivox_validate_community_comments_before_write on public.community_comments;
create trigger nivox_validate_community_comments_before_write
before insert or update of body on public.community_comments
for each row execute function public.nivox_validate_community_content();

drop trigger if exists nivox_validate_reports_before_write on public.content_reports;
create trigger nivox_validate_reports_before_write
before insert or update of reason on public.content_reports
for each row execute function public.nivox_validate_community_content();

create or replace function public.nivox_protect_community_post()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.author_id is distinct from new.author_id then
    raise exception using errcode = '42501', message = 'No se puede cambiar el autor';
  end if;
  if old.status is distinct from new.status and not private.is_admin() then
    raise exception using errcode = '42501', message = 'No puedes cambiar el estado de moderación';
  end if;
  -- En cambios directos desde la API, los contadores son inmutables.
  -- Los triggers internos de votos/comentarios se ejecutan con profundidad > 1 y sí pueden ajustarlos.
  if pg_trigger_depth() = 1 then
    new.vote_count := old.vote_count;
    new.comment_count := old.comment_count;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists nivox_protect_community_post_before_update on public.community_posts;
create trigger nivox_protect_community_post_before_update
before update on public.community_posts
for each row execute function public.nivox_protect_community_post();

create or replace function public.nivox_protect_community_comment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.author_id is distinct from new.author_id or old.post_id is distinct from new.post_id then
    raise exception using errcode = '42501', message = 'No se puede cambiar el autor o la publicación';
  end if;
  if old.status is distinct from new.status and not private.is_admin() then
    raise exception using errcode = '42501', message = 'No puedes cambiar el estado de moderación';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists nivox_protect_community_comment_before_update on public.community_comments;
create trigger nivox_protect_community_comment_before_update
before update on public.community_comments
for each row execute function public.nivox_protect_community_comment();

-- 8) Contadores atómicos. El cliente no puede falsificarlos.
create or replace function public.nivox_adjust_vote_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts set vote_count = vote_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.community_posts set vote_count = greatest(vote_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists nivox_vote_count_after_change on public.community_votes;
create trigger nivox_vote_count_after_change
after insert or delete on public.community_votes
for each row execute function public.nivox_adjust_vote_count();

create or replace function public.nivox_adjust_comment_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.status = 'published' then
    update public.community_posts set comment_count = comment_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' and old.status = 'published' then
    update public.community_posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    return old;
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    if old.status = 'published' and new.status <> 'published' then
      update public.community_posts set comment_count = greatest(comment_count - 1, 0) where id = new.post_id;
    elsif old.status <> 'published' and new.status = 'published' then
      update public.community_posts set comment_count = comment_count + 1 where id = new.post_id;
    end if;
    return new;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists nivox_comment_count_after_change on public.community_comments;
create trigger nivox_comment_count_after_change
after insert or delete or update of status on public.community_comments
for each row execute function public.nivox_adjust_comment_count();

-- 9) Evita varias denuncias abiertas idénticas del mismo usuario sobre el mismo contenido.
create unique index if not exists content_reports_one_open_per_user_content
on public.content_reports(reporter_id, content_type, content_id)
where status = 'open' and reporter_id is not null;

-- 10) Bucket público para imágenes de la comunidad. Máximo 5 MB y formatos de imagen comunes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-media', 'community-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "community_media_user_upload" on storage.objects;
drop policy if exists "community_media_user_delete" on storage.objects;

create policy "community_media_user_upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'community-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','gif')
);

create policy "community_media_user_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'community-media'
  and owner_id = (select auth.uid())::text
);

-- 11) Grants explícitos.
grant select on public.community_posts, public.community_comments to anon, authenticated;
grant insert, update, delete on public.community_posts, public.community_comments to authenticated;
grant select, insert, delete on public.community_votes to authenticated;



-- ===== NIVOX v0.6 additions =====
-- NIVOX v0.6 — perfiles públicos, seguidores, respuestas y notificaciones
-- Ejecuta UNA VEZ después de haber aplicado v0.5.

-- 1) Seguidores
create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);
create index if not exists user_follows_following_idx on public.user_follows(following_id, created_at desc);
create index if not exists user_follows_follower_idx on public.user_follows(follower_id, created_at desc);
alter table public.user_follows enable row level security;

drop policy if exists "user_follows_public_read" on public.user_follows;
drop policy if exists "user_follows_own_insert" on public.user_follows;
drop policy if exists "user_follows_own_delete" on public.user_follows;
create policy "user_follows_public_read" on public.user_follows
for select to anon, authenticated using (true);
create policy "user_follows_own_insert" on public.user_follows
for insert to authenticated with check ((select auth.uid()) = follower_id and follower_id <> following_id);
create policy "user_follows_own_delete" on public.user_follows
for delete to authenticated using ((select auth.uid()) = follower_id);

grant select on public.user_follows to anon, authenticated;
grant insert, delete on public.user_follows to authenticated;

-- 2) Respuestas a comentarios (un nivel visual; la base permite relación padre)
alter table public.community_comments add column if not exists parent_comment_id uuid;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'community_comments_parent_comment_id_fkey'
      and conrelid = 'public.community_comments'::regclass
  ) then
    alter table public.community_comments
      add constraint community_comments_parent_comment_id_fkey
      foreign key (parent_comment_id) references public.community_comments(id) on delete set null;
  end if;
end $$;
create index if not exists community_comments_parent_idx on public.community_comments(parent_comment_id);

create or replace function public.nivox_validate_comment_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_post uuid;
  parent_status text;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  if new.parent_comment_id = new.id then
    raise exception using errcode = '22023', message = 'Un comentario no puede responderse a sí mismo';
  end if;

  select post_id, status into parent_post, parent_status
  from public.community_comments
  where id = new.parent_comment_id;

  if parent_post is null or parent_post <> new.post_id or parent_status <> 'published' then
    raise exception using errcode = '22023', message = 'La respuesta no pertenece a un comentario válido';
  end if;

  return new;
end;
$$;

drop trigger if exists nivox_validate_comment_parent_before_write on public.community_comments;
create trigger nivox_validate_comment_parent_before_write
before insert or update of parent_comment_id, post_id on public.community_comments
for each row execute function public.nivox_validate_comment_parent();

-- El comentario puede editar su texto, pero no cambiar después de publicado a qué comentario responde.
create or replace function public.nivox_protect_community_comment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.author_id is distinct from new.author_id or old.post_id is distinct from new.post_id then
    raise exception using errcode = '42501', message = 'No se puede cambiar el autor o la publicación';
  end if;
  if old.parent_comment_id is distinct from new.parent_comment_id then
    raise exception using errcode = '42501', message = 'No se puede cambiar el comentario al que responde';
  end if;
  if old.status is distinct from new.status and not private.is_admin() then
    raise exception using errcode = '42501', message = 'No puedes cambiar el estado de moderación';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- El trigger ya existe desde v0.5 y usará automáticamente esta nueva versión de la función.

-- 3) Notificaciones privadas
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('follow','comment','reply','vote')),
  source_type text not null check (source_type in ('profile','post','comment')),
  source_id text not null,
  post_id uuid references public.community_posts(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_not_self check (user_id <> actor_id)
);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, created_at desc) where read_at is null;
create unique index if not exists notifications_unique_event
on public.notifications(user_id, actor_id, type, source_type, source_id);
alter table public.notifications enable row level security;

drop policy if exists "notifications_own_read" on public.notifications;
drop policy if exists "notifications_own_update" on public.notifications;
drop policy if exists "notifications_own_delete" on public.notifications;
create policy "notifications_own_read" on public.notifications
for select to authenticated using ((select auth.uid()) = user_id);
create policy "notifications_own_update" on public.notifications
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "notifications_own_delete" on public.notifications
for delete to authenticated using ((select auth.uid()) = user_id);

grant select, update, delete on public.notifications to authenticated;
revoke insert on public.notifications from authenticated;

-- 4) Notificación al seguir / dejar de seguir
create or replace function public.nivox_notify_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.follower_id <> new.following_id then
      insert into public.notifications(user_id, actor_id, type, source_type, source_id)
      values (new.following_id, new.follower_id, 'follow', 'profile', new.follower_id::text)
      on conflict (user_id, actor_id, type, source_type, source_id) do update
        set created_at = now(), read_at = null;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    delete from public.notifications
    where user_id = old.following_id
      and actor_id = old.follower_id
      and type = 'follow'
      and source_type = 'profile'
      and source_id = old.follower_id::text;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists nivox_notify_follow_after_change on public.user_follows;
create trigger nivox_notify_follow_after_change
after insert or delete on public.user_follows
for each row execute function public.nivox_notify_follow();

-- 5) Notificación de votos
create or replace function public.nivox_notify_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  if tg_op = 'INSERT' then
    select author_id into recipient from public.community_posts where id = new.post_id;
    if recipient is not null and recipient <> new.user_id then
      insert into public.notifications(user_id, actor_id, type, source_type, source_id, post_id)
      values (recipient, new.user_id, 'vote', 'post', new.post_id::text, new.post_id)
      on conflict (user_id, actor_id, type, source_type, source_id) do update
        set created_at = now(), read_at = null, post_id = excluded.post_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    delete from public.notifications
    where actor_id = old.user_id
      and type = 'vote'
      and source_type = 'post'
      and source_id = old.post_id::text;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists nivox_notify_vote_after_change on public.community_votes;
create trigger nivox_notify_vote_after_change
after insert or delete on public.community_votes
for each row execute function public.nivox_notify_vote();

-- 6) Notificaciones de comentarios y respuestas
create or replace function public.nivox_notify_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author uuid;
  parent_author uuid;
begin
  if tg_op = 'INSERT' then
    select author_id into post_author from public.community_posts where id = new.post_id;

    if new.parent_comment_id is not null then
      select author_id into parent_author from public.community_comments where id = new.parent_comment_id;
      if parent_author is not null and parent_author <> new.author_id then
        insert into public.notifications(user_id, actor_id, type, source_type, source_id, post_id)
        values (parent_author, new.author_id, 'reply', 'comment', new.id::text, new.post_id)
        on conflict (user_id, actor_id, type, source_type, source_id) do nothing;
      end if;
    end if;

    if post_author is not null
       and post_author <> new.author_id
       and (parent_author is null or post_author <> parent_author) then
      insert into public.notifications(user_id, actor_id, type, source_type, source_id, post_id)
      values (post_author, new.author_id, 'comment', 'comment', new.id::text, new.post_id)
      on conflict (user_id, actor_id, type, source_type, source_id) do nothing;
    end if;

    return new;
  elsif tg_op = 'DELETE' then
    delete from public.notifications
    where source_type = 'comment' and source_id = old.id::text;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists nivox_notify_comment_after_change on public.community_comments;
create trigger nivox_notify_comment_after_change
after insert or delete on public.community_comments
for each row execute function public.nivox_notify_comment();

-- 7) Función RPC para estadísticas públicas de perfil sin exponer bibliotecas privadas.
create or replace function public.nivox_profile_stats(profile_id uuid)
returns table (followers bigint, following bigint, posts bigint, votes bigint, comments bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.user_follows f where f.following_id = profile_id),
    (select count(*) from public.user_follows f where f.follower_id = profile_id),
    (select count(*) from public.community_posts p where p.author_id = profile_id and p.status = 'published'),
    (select coalesce(sum(p.vote_count),0) from public.community_posts p where p.author_id = profile_id and p.status = 'published'),
    (select count(*) from public.community_comments c join public.community_posts p on p.id = c.post_id where c.author_id = profile_id and c.status = 'published' and p.status = 'published');
$$;

grant execute on function public.nivox_profile_stats(uuid) to anon, authenticated;

