-- Supabase / Postgres schema for Asualy

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  is_moving boolean default false,
  from_country text,
  to_country text,
  to_province text,
  to_city text,
  current_country text,
  current_province text,
  current_city text,
  role text,
  reasons text,
  is_service_provider boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  country text not null,
  province text,
  city text,
  name text not null,
  is_active boolean default true,
  min_users_to_activate integer default 5,
  created_at timestamptz default now()
);

create table if not exists public.room_memberships (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id),
  sender_id uuid references public.profiles(id),
  receiver_id uuid references public.profiles(id),
  text text not null,
  created_at timestamptz default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  friend_id uuid references public.profiles(id),
  status text not null,
  created_at timestamptz default now()
);

create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  country text not null,
  province text not null,
  title text not null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  category text not null,
  title text not null,
  description text not null,
  price numeric,
  price_currency text default 'CAD',
  country text not null,
  province text not null,
  city text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.listing_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);
