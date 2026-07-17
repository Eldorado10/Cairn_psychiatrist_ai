-- Cairn — initial schema: enums, tables, indexes.
-- Plain SQL, applied with the Supabase CLI (supabase db push / migration up).

-- ---------------------------------------------------------------- enums

create type risk_level as enum ('low', 'moderate', 'elevated', 'high');

create type appointment_status as enum (
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show'
);

create type message_role as enum ('user', 'assistant', 'system');

-- ---------------------------------------------------------------- tables

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  date_of_birth date,
  phone text,
  locale text default 'en',
  created_at timestamptz default now()
);

create table doctors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  title text,
  specialties text[] not null,
  bio text,
  photo_url text,
  languages text[],
  consultation_fee integer,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table availability_slots (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references doctors (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_booked boolean default false,
  unique (doctor_id, starts_at)
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz,
  status text default 'active'
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations (id) on delete cascade,
  role message_role not null,
  content text not null,
  created_at timestamptz default now()
);

create table assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  -- set null (not cascade): assessments are clinical records and must
  -- survive deletion of the conversation they came from.
  conversation_id uuid references conversations (id) on delete set null,
  risk risk_level not null,
  risk_rationale text,
  primary_concern text,
  secondary_concerns text[],
  wellbeing_score integer check (wellbeing_score between 0 and 100),
  ai_summary text,
  ai_suggestion text,
  recommended_specialties text[],
  needs_urgent_review boolean default false,
  model_used text,
  created_at timestamptz default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  doctor_id uuid references doctors (id),
  slot_id uuid references availability_slots (id),
  assessment_id uuid references assessments (id),
  status appointment_status default 'pending',
  patient_note text,
  created_at timestamptz default now()
);

create table crisis_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  conversation_id uuid,
  message_id uuid,
  trigger_source text not null check (trigger_source in ('keyword', 'model')),
  matched_rule text,
  acknowledged_at timestamptz,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------- indexes

create index messages_conversation_created_idx
  on messages (conversation_id, created_at);

create index assessments_user_created_idx
  on assessments (user_id, created_at desc);

create index appointments_user_created_idx
  on appointments (user_id, created_at desc);

create index availability_slots_open_idx
  on availability_slots (doctor_id, starts_at)
  where is_booked = false;
