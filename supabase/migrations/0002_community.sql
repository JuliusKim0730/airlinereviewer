-- Profiles, reviews, community board, companions, stories, expenses, moderation.
-- Writing rules mirror src/lib/access.ts: reading is public, writing needs a
-- session, and writing content or joining companions needs a verified trip.

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  -- SHA-256 of the boarding-pass passenger name this account verified first.
  -- Later passes with a different name are refused, so nobody verifies on
  -- someone else's ticket. Only the hash and a masked name are kept.
  passenger_hash text,
  passenger_mask text,
  name_mismatches integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users edit their own profile" on public.profiles for update using (auth.uid() = id);
-- Users may change their nickname, but not the passenger binding or mismatch count.
revoke update on public.profiles from authenticated, anon;
grant update (nickname) on public.profiles to authenticated;

-- Every new auth user (guest or Google) gets a profile with a random nickname.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', '여행자' || lpad((floor(random() * 10000))::text, 4, '0')));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- trips.user_id now also points at profiles so author joins work.
alter table public.trips
  add constraint trips_user_profile_fkey foreign key (user_id) references public.profiles (id) on delete cascade;

create function public.is_verified(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trips where user_id = uid);
$$;

-- Verified for a city on a date: a stay window (arrival .. next flight out, or +7 days) covers it.
create function public.in_city(uid uuid, city_iata text, on_date date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.trips t
    where t.user_id = uid
      and t.arr_iata = city_iata
      and t.flight_date <= on_date
      and on_date <= coalesce(
        (select min(n.flight_date) from public.trips n
          where n.user_id = uid and n.dep_iata = city_iata and n.flight_date >= t.flight_date),
        t.flight_date + 7)
  );
$$;

-- Bind each account to one passenger name. The first verified pass sets it;
-- a pass with a different name is refused and counted against trust.
alter table public.trips add column passenger_hash text not null default '', add column passenger_mask text not null default '';

create function public.check_passenger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  bound text;
begin
  select passenger_hash into bound from public.profiles where id = new.user_id;
  if bound is null then
    update public.profiles set passenger_hash = new.passenger_hash, passenger_mask = new.passenger_mask where id = new.user_id;
  elsif bound <> new.passenger_hash then
    raise exception 'passenger_mismatch' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger trips_check_passenger before insert on public.trips
  for each row execute function public.check_passenger();

-- Called by the client after a refused pass, since the refused insert rolls back.
create function public.report_name_mismatch() returns void
language sql security definer set search_path = public as $$
  update public.profiles set name_mismatches = name_mismatches + 1 where id = auth.uid();
$$;

-- ---------------------------------------------------------------- reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- Set only for a boarding pass this author verified (enforced by the insert policy).
  trip_id uuid references public.trips (id) on delete set null,
  verified boolean generated always as (trip_id is not null) stored,
  is_past boolean not null default false,
  -- Flight fields are optional for unverified reviews.
  dep_iata text not null default '',
  arr_iata text not null default '',
  carrier text not null default '',
  flight_number text not null default '',
  flight_date date,
  aircraft text,
  seat text not null default '',
  -- 가심비 (satisfaction for the money) and a one-line summary are required.
  value smallint not null check (value between 1 and 5),
  summary text not null check (char_length(summary) between 1 and 80),
  -- seatSpace, seatTemp, recline, seatNote, pros, cons, tips, meal, lavatory, lavatoryNote, extra
  details jsonb not null default '{}',
  photos text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index reviews_route_idx on public.reviews (carrier, dep_iata, arr_iata);

alter table public.reviews enable row level security;
create policy "Reviews are public" on public.reviews for select using (true);
create policy "Signed-in users review, verified only for their own trips" on public.reviews for insert
  with check (auth.uid() = author_id
    and (trip_id is null or exists (select 1 from public.trips where id = trip_id and user_id = auth.uid())));
create policy "Authors delete their reviews" on public.reviews for delete using (auth.uid() = author_id);

-- ---------------------------------------------------------------- community
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  board text not null check (board in ('city', 'airline', 'free')),
  tag text not null default '',
  title text not null check (char_length(title) between 1 and 100),
  body text not null check (char_length(body) between 1 and 5000),
  photos text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (post_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create view public.posts_with_counts with (security_invoker = true) as
  select p.*,
    (select count(*) from public.post_likes l where l.post_id = p.id) as like_count,
    (select count(*) from public.comments c where c.post_id = p.id) as comment_count
  from public.posts p;

alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
create policy "Posts are public" on public.posts for select using (true);
create policy "Verified travellers post" on public.posts for insert with check (auth.uid() = author_id and public.is_verified(auth.uid()));
create policy "Authors delete posts" on public.posts for delete using (auth.uid() = author_id);
create policy "Likes are public" on public.post_likes for select using (true);
create policy "Signed-in users like" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "Users unlike" on public.post_likes for delete using (auth.uid() = user_id);
create policy "Comments are public" on public.comments for select using (true);
create policy "Verified travellers comment" on public.comments for insert with check (auth.uid() = author_id and public.is_verified(auth.uid()));
create policy "Authors delete comments" on public.comments for delete using (auth.uid() = author_id);

-- ---------------------------------------------------------------- companions
create table public.companion_posts (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  host_trust smallint not null default 0,
  iata char(3) not null,
  city text not null,
  meet_date date not null,
  time_slot text not null,
  activity text not null check (char_length(activity) between 1 and 200),
  capacity smallint not null check (capacity between 1 and 10),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table public.companion_requests (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.companion_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_trust smallint not null default 0,
  message text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table public.companion_messages (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.companion_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table public.companion_ratings (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.companion_posts (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  ratee_id uuid not null references public.profiles (id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  showed_up boolean not null,
  created_at timestamptz not null default now(),
  unique (post_id, rater_id, ratee_id),
  check (rater_id <> ratee_id)
);

create view public.companions_with_members with (security_invoker = true) as
  select c.*,
    (select count(*) from public.companion_requests r where r.post_id = c.id and r.status = 'accepted') as member_count
  from public.companion_posts c;

-- Host or accepted member of a companion post.
create function public.in_party(uid uuid, pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.companion_posts where id = pid and host_id = uid)
      or exists (select 1 from public.companion_requests where post_id = pid and user_id = uid and status = 'accepted');
$$;

alter table public.companion_posts enable row level security;
alter table public.companion_requests enable row level security;
alter table public.companion_messages enable row level security;
alter table public.companion_ratings enable row level security;

create policy "Companion posts are public" on public.companion_posts for select using (true);
create policy "Hosts must be in the city that day" on public.companion_posts for insert
  with check (auth.uid() = host_id and public.in_city(auth.uid(), iata, meet_date));
create policy "Hosts update their posts" on public.companion_posts for update using (auth.uid() = host_id);

create policy "Requests visible to host and requester" on public.companion_requests for select
  using (auth.uid() = user_id or exists (select 1 from public.companion_posts p where p.id = post_id and p.host_id = auth.uid()));
create policy "Join only when in the city that day" on public.companion_requests for insert
  with check (auth.uid() = user_id and status = 'pending' and exists (
    select 1 from public.companion_posts p
    where p.id = post_id and p.status = 'open' and p.host_id <> auth.uid() and public.in_city(auth.uid(), p.iata, p.meet_date)));
create policy "Hosts answer requests" on public.companion_requests for update
  using (exists (select 1 from public.companion_posts p where p.id = post_id and p.host_id = auth.uid()));

create policy "Party reads its chat" on public.companion_messages for select using (public.in_party(auth.uid(), post_id));
create policy "Party writes its chat" on public.companion_messages for insert with check (auth.uid() = author_id and public.in_party(auth.uid(), post_id));

create policy "Ratings readable by rater and ratee" on public.companion_ratings for select using (auth.uid() in (rater_id, ratee_id));
create policy "Party members rate each other after the meet" on public.companion_ratings for insert
  with check (auth.uid() = rater_id and public.in_party(auth.uid(), post_id) and public.in_party(ratee_id, post_id)
    and exists (select 1 from public.companion_posts p where p.id = post_id and p.meet_date <= current_date));
create policy "Raters revise their rating" on public.companion_ratings for update using (auth.uid() = rater_id);

alter publication supabase_realtime add table public.companion_messages;

-- ---------------------------------------------------------------- stories
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  iata char(3) not null,
  city text not null,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text not null default '' check (char_length(caption) <= 200),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index stories_expires_idx on public.stories (expires_at);

alter table public.stories enable row level security;
create policy "Live stories are public" on public.stories for select using (expires_at > now());
create policy "Post stories only from the city you are in today" on public.stories for insert
  with check (auth.uid() = author_id and public.in_city(auth.uid(), iata, (now() at time zone 'Asia/Seoul')::date));
create policy "Authors delete stories" on public.stories for delete using (auth.uid() = author_id);

-- ---------------------------------------------------------------- expenses
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  category text not null check (category in ('flight', 'stay', 'food', 'activity', 'shopping', 'transport', 'etc')),
  amount numeric(14, 2) not null check (amount >= 0),
  currency char(3) not null,
  memo text not null default '',
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;
create policy "Users manage their own expenses" on public.expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- moderation
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('user', 'review', 'post', 'comment', 'story', 'companion')),
  target_id text not null,
  reason text not null,
  -- Set by a moderator; only upheld reports count against trust.
  upheld boolean,
  created_at timestamptz not null default now()
);

create table public.blocks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  primary key (user_id, blocked_id)
);

alter table public.reports enable row level security;
alter table public.blocks enable row level security;
create policy "Signed-in users report" on public.reports for insert with check (auth.uid() = reporter_id);
create policy "Users manage their blocks" on public.blocks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public trust inputs for any user, without exposing individual ratings or reports.
create function public.trust_inputs(target uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'ratings', coalesce((select json_agg(json_build_object('score', score, 'showed_up', showed_up)) from public.companion_ratings where ratee_id = target), '[]'::json),
    'reviews', (select count(*) from public.reviews where author_id = target),
    'posts', (select count(*) from public.posts where author_id = target),
    'reports', (select count(*) from public.reports where target_type = 'user' and target_id = target::text and upheld)
  );
$$;

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 20971520)
on conflict (id) do nothing;

create policy "Users upload into their own folder" on storage.objects for insert
  with check (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Media is public" on storage.objects for select using (bucket_id = 'media');
create policy "Users delete their own media" on storage.objects for delete
  using (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);

-- Expired stories: delete rows hourly (requires the pg_cron extension).
-- Media files are removed by the storage lifecycle or a scheduled Edge Function.
create extension if not exists pg_cron;
select cron.schedule('expire-stories', '0 * * * *', $$delete from public.stories where expires_at <= now()$$);
