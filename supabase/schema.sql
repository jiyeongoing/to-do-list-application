create table if not exists public.todo_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.todo_states enable row level security;

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
