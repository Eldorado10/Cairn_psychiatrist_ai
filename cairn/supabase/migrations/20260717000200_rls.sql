-- Cairn — Row Level Security.
-- RLS is enabled on every table; anything without a policy is denied.
-- There are deliberately NO delete policies anywhere, and none will be
-- added for messages/assessments: clinical records are append-only.
-- doctors/availability_slots are read-only to clients; all writes to them
-- go through the service role (which bypasses RLS).

alter table profiles enable row level security;
alter table doctors enable row level security;
alter table availability_slots enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table assessments enable row level security;
alter table appointments enable row level security;
alter table crisis_events enable row level security;

-- ------------------------------------------------------------- profiles
-- profiles.id IS the user id (references auth.users).

create policy "profiles_select_own" on profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_insert_own" on profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own" on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- -------------------------------------------------------- conversations

create policy "conversations_select_own" on conversations
  for select to authenticated
  using (user_id = auth.uid());

create policy "conversations_insert_own" on conversations
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "conversations_update_own" on conversations
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------- messages
-- Ownership derives from the parent conversation.

create policy "messages_select_own" on messages
  for select to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

create policy "messages_insert_own" on messages
  for insert to authenticated
  with check (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

create policy "messages_update_own" on messages
  for update to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------- assessments

create policy "assessments_select_own" on assessments
  for select to authenticated
  using (user_id = auth.uid());

create policy "assessments_insert_own" on assessments
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "assessments_update_own" on assessments
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --------------------------------------------------------- appointments

create policy "appointments_select_own" on appointments
  for select to authenticated
  using (user_id = auth.uid());

create policy "appointments_insert_own" on appointments
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "appointments_update_own" on appointments
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -------------------------------------------------------- crisis_events

create policy "crisis_events_select_own" on crisis_events
  for select to authenticated
  using (user_id = auth.uid());

create policy "crisis_events_insert_own" on crisis_events
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "crisis_events_update_own" on crisis_events
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -------------------------------------------------- doctors (read-only)

create policy "doctors_public_select_active" on doctors
  for select to anon, authenticated
  using (is_active = true);

-- --------------------------------------- availability_slots (read-only)
-- Slots are public only while their doctor is active.

create policy "slots_public_select_active" on availability_slots
  for select to anon, authenticated
  using (
    exists (
      select 1 from doctors d
      where d.id = availability_slots.doctor_id and d.is_active = true
    )
  );
