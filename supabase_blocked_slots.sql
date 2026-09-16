-- Admin-managed appointment blocks.
create table if not exists public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  time_slot varchar(20) not null,
  reason text,
  created_at timestamptz not null default now(),
  admin_id character varying not null references public.admin(admin_id) on delete restrict,
  constraint blocked_slots_date_time_unique unique (date, time_slot)
);

create index if not exists blocked_slots_date_time_idx
  on public.blocked_slots (date, time_slot);

alter table public.blocked_slots enable row level security;

-- The Express API uses the Supabase service role key, so no client policies are required.
