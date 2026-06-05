create table if not exists public.todo_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.todo_states enable row level security;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 1 and 30),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own todo state"
on public.todo_states
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own todo state"
on public.todo_states
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own todo state"
on public.todo_states
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own todo state"
on public.todo_states
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.is_email_available(candidate_email text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(candidate_email))
  );
$$;

revoke all on function public.is_email_available(text) from public;
grant execute on function public.is_email_available(text) to anon, authenticated;

create policy "Users can read own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own profile"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
