-- Verified flights. One row per boarding-pass leg a user has claimed.
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dep_iata char(3) not null,
  arr_iata char(3) not null,
  carrier text not null,
  flight_number text not null,
  flight_date date not null,
  seat text not null default '',
  compartment text not null default '',
  -- SHA-256 of PNR + surname + leg. The raw PNR is never stored.
  ticket_hash text not null,
  verification_method text not null check (verification_method in ('barcode', 'ocr')),
  created_at timestamptz not null default now()
);

-- The same boarding pass leg can be claimed by only one account.
create unique index trips_ticket_hash_key on public.trips (ticket_hash);
create index trips_user_id_idx on public.trips (user_id, flight_date desc);

alter table public.trips enable row level security;

create policy "Users read their own trips" on public.trips
  for select using (auth.uid() = user_id);

create policy "Users add their own trips" on public.trips
  for insert with check (auth.uid() = user_id);

create policy "Users delete their own trips" on public.trips
  for delete using (auth.uid() = user_id);
