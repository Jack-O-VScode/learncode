-- ===========================================================================
--  LearnCode — Supabase schema
--
--  HOW TO RUN THIS
--  1. Open your project at https://supabase.com/dashboard
--  2. Click "SQL Editor" in the left sidebar, then "New query"
--  3. Paste this whole file in and press "Run"
--
--  It is safe to run more than once.
-- ===========================================================================


-- ---------------------------------------------------------------------------
--  A NOTE ON WHERE THE EMAIL AND PASSWORD LIVE
--
--  You asked for the email and password to be stored in the database. They
--  are — Supabase Auth keeps them in its own `auth.users` table, which is a
--  real table in this same Postgres database. You can see every account at
--  Dashboard -> Authentication -> Users.
--
--  The password is stored as a bcrypt HASH rather than as plain text. That is
--  deliberate and it is not something to work around: anyone who ever got a
--  copy of the database would otherwise have the real password for every one
--  of your friends — and people reuse passwords, so it would not stop at this
--  site. Hashing means sign-in still works exactly the same way while a
--  leaked database is worthless.
--
--  The `profiles` table below is a readable copy of the email that you can
--  join against in your own queries, since `auth.users` is in a schema you
--  cannot query directly from the browser.
-- ---------------------------------------------------------------------------


-- ===========================================================================
--  1. profiles — one row per account
-- ===========================================================================

create table if not exists public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  email       text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Each person may only see and edit their own row.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- Create the profile row automatically whenever an account is created, so it
-- exists even if the app never gets round to writing it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ===========================================================================
--  2. progress — one row per (person, track, level)
--
--  The app writes to this after EVERY answered question, so closing the tab
--  halfway through a level and coming back later — on another device — lands
--  you on exactly the step you stopped at.
-- ===========================================================================

create table if not exists public.progress (
  user_id         uuid        not null references auth.users (id) on delete cascade,
  track           text        not null,   -- 'python' | 'html' | 'cpp' | 'cpp-gl'
  level           text        not null,   -- 'beginner' ... 'pro'
  step_index      integer     not null default 0,
  completed_steps text[]      not null default '{}',
  attempts        integer     not null default 0,
  correct         integer     not null default 0,
  finished        boolean     not null default false,
  updated_at      timestamptz not null default now(),

  primary key (user_id, track, level),

  -- Track ids are validated by shape rather than a fixed list, so adding new
  -- courses (like the cybersecurity modes) never needs a database migration.
  constraint progress_track_valid
    check (track ~ '^[a-z0-9-]+$' and char_length(track) between 2 and 40),
  constraint progress_level_valid
    check (level in ('beginner', 'amateur', 'intermediate', 'skilled', 'pro')),
  constraint progress_step_index_sane
    check (step_index >= 0 and step_index < 1000),
  constraint progress_counts_sane
    check (attempts >= 0 and correct >= 0 and correct <= attempts + 1000)
);

create index if not exists progress_user_idx on public.progress (user_id);

alter table public.progress enable row level security;

-- Nobody can read, write or delete anybody else's progress.
drop policy if exists "read own progress" on public.progress;
create policy "read own progress"
  on public.progress for select
  using (auth.uid() = user_id);

drop policy if exists "insert own progress" on public.progress;
create policy "insert own progress"
  on public.progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own progress" on public.progress;
create policy "update own progress"
  on public.progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own progress" on public.progress;
create policy "delete own progress"
  on public.progress for delete
  using (auth.uid() = user_id);


-- ===========================================================================
--  2b. MIGRATION for databases created before the cybersecurity tracks
--
--  `create table if not exists` above does nothing to a table that already
--  exists, so a database set up with the original four-track whitelist would
--  reject the new 'blue-*' and 'red-*' track ids. This block relaxes the
--  check to the shape-based rule. It is safe to run every time.
-- ===========================================================================

alter table public.progress drop constraint if exists progress_track_valid;
alter table public.progress add constraint progress_track_valid
  check (track ~ '^[a-z0-9-]+$' and char_length(track) between 2 and 40);


-- ===========================================================================
--  3. A convenience view for you, the owner
--
--  Run `select * from my_progress;` in the SQL editor to see how far you have
--  got. (RLS still applies, so it only ever shows your own rows.)
-- ===========================================================================

create or replace view public.my_progress as
select
  p.track,
  p.level,
  p.step_index,
  cardinality(p.completed_steps) as steps_done,
  p.correct,
  p.attempts,
  p.finished,
  p.updated_at
from public.progress p
where p.user_id = auth.uid()
order by p.track, p.level;


-- ===========================================================================
--  DONE.
--
--  One more thing, and it is NOT sql — you asked for no confirmation emails:
--
--    Dashboard -> Authentication -> Sign In / Providers -> Email
--      * turn "Confirm email" OFF
--      * leave "Allow new users to sign up" ON while you and your friends
--        are creating accounts (you can switch it off afterwards so nobody
--        else can join)
--
--  Without that, Supabase creates the account but will not sign the person in
--  until they click a link in an email — which is exactly what you wanted to
--  avoid. The app detects this and shows a message saying so.
-- ===========================================================================
