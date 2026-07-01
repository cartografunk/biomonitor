-- Biomonitor RLS policies
-- Run this in Supabase SQL editor after the schema and seed users exist.

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text
  from public.users
  where id = auth.uid()
  limit 1
$$;

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'editor', false)
$$;

alter table public.users enable row level security;
alter table public.visits enable row level security;
alter table public.fixed_points enable row level security;
alter table public.visit_point_records enable row level security;
alter table public.water_measurements enable row level security;
alter table public.extra_events enable row level security;
alter table public.photos enable row level security;
alter table public.reports enable row level security;

drop policy if exists "users_select_authenticated" on public.users;
create policy "users_select_authenticated"
on public.users for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "users_insert_self" on public.users;
create policy "users_insert_self"
on public.users for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "users_update_self_or_editor" on public.users;
create policy "users_update_self_or_editor"
on public.users for update
to authenticated
using (id = auth.uid() or public.is_editor())
with check (id = auth.uid() or public.is_editor());

drop policy if exists "visits_select_authenticated" on public.visits;
create policy "visits_select_authenticated"
on public.visits for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "visits_insert_editor" on public.visits;
create policy "visits_insert_editor"
on public.visits for insert
to authenticated
with check (public.is_editor() and created_by = auth.uid());

drop policy if exists "visits_update_editor" on public.visits;
create policy "visits_update_editor"
on public.visits for update
to authenticated
using (public.is_editor())
with check (public.is_editor());

drop policy if exists "visits_delete_editor" on public.visits;
create policy "visits_delete_editor"
on public.visits for delete
to authenticated
using (public.is_editor());

drop policy if exists "fixed_points_select_authenticated" on public.fixed_points;
create policy "fixed_points_select_authenticated"
on public.fixed_points for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "visit_point_records_select_authenticated" on public.visit_point_records;
create policy "visit_point_records_select_authenticated"
on public.visit_point_records for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "visit_point_records_insert_editor" on public.visit_point_records;
create policy "visit_point_records_insert_editor"
on public.visit_point_records for insert
to authenticated
with check (public.is_editor());

drop policy if exists "visit_point_records_update_editor" on public.visit_point_records;
create policy "visit_point_records_update_editor"
on public.visit_point_records for update
to authenticated
using (public.is_editor())
with check (public.is_editor());

drop policy if exists "water_measurements_select_authenticated" on public.water_measurements;
create policy "water_measurements_select_authenticated"
on public.water_measurements for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "water_measurements_insert_editor" on public.water_measurements;
create policy "water_measurements_insert_editor"
on public.water_measurements for insert
to authenticated
with check (public.is_editor());

drop policy if exists "water_measurements_update_editor" on public.water_measurements;
create policy "water_measurements_update_editor"
on public.water_measurements for update
to authenticated
using (public.is_editor())
with check (public.is_editor());

drop policy if exists "extra_events_select_authenticated" on public.extra_events;
create policy "extra_events_select_authenticated"
on public.extra_events for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "extra_events_insert_editor" on public.extra_events;
create policy "extra_events_insert_editor"
on public.extra_events for insert
to authenticated
with check (public.is_editor() and created_by = auth.uid());

drop policy if exists "extra_events_update_editor" on public.extra_events;
create policy "extra_events_update_editor"
on public.extra_events for update
to authenticated
using (public.is_editor())
with check (public.is_editor());

drop policy if exists "extra_events_delete_editor" on public.extra_events;
create policy "extra_events_delete_editor"
on public.extra_events for delete
to authenticated
using (public.is_editor());

drop policy if exists "photos_select_authenticated" on public.photos;
create policy "photos_select_authenticated"
on public.photos for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "photos_insert_editor" on public.photos;
create policy "photos_insert_editor"
on public.photos for insert
to authenticated
with check (public.is_editor());

drop policy if exists "photos_delete_editor" on public.photos;
create policy "photos_delete_editor"
on public.photos for delete
to authenticated
using (public.is_editor());

drop policy if exists "reports_select_authenticated" on public.reports;
create policy "reports_select_authenticated"
on public.reports for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "reports_insert_editor" on public.reports;
create policy "reports_insert_editor"
on public.reports for insert
to authenticated
with check (public.is_editor());

grant select on public.visit_point_status to authenticated;
