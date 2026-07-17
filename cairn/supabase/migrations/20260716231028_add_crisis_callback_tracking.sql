alter table public.crisis_events
  add column if not exists urgent_callback_requested_at timestamptz;

-- The route uses the caller's authenticated session; RLS remains the row-level
-- ownership boundary while these grants expose only the required verbs.
grant select, insert, update on table public.crisis_events to authenticated;
grant select, update on table public.assessments to authenticated;

create index if not exists crisis_events_user_created_idx
  on public.crisis_events (user_id, created_at desc);

create index if not exists crisis_events_conversation_created_idx
  on public.crisis_events (conversation_id, created_at desc);

create index if not exists assessments_conversation_created_idx
  on public.assessments (conversation_id, created_at desc)
  where conversation_id is not null;
