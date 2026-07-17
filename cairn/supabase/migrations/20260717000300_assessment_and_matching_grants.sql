-- Grants for the post-conversation assessment flow. This project does not
-- carry default table privileges, so every verb PostgREST needs must be
-- granted explicitly; RLS (already in place) stays the row-level boundary.

-- The finish route writes the assessment with the caller's session.
grant insert on table public.assessments to authenticated;

-- Doctor matching (and the public clinician gallery) read active doctors and
-- their open slots through the existing public-select RLS policies.
grant select on table public.doctors to anon, authenticated;
grant select on table public.availability_slots to anon, authenticated;
