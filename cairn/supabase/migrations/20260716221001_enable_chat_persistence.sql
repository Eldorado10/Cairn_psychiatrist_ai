-- Chat reads and writes go through the authenticated user's session. RLS is
-- still the ownership boundary; these grants only expose the allowed verbs to
-- PostgREST.
grant select, insert, update on table public.conversations to authenticated;
grant select, insert on table public.messages to authenticated;

-- Messages are a transcript. Once written, neither clients nor route handlers
-- should be able to rewrite them.
drop policy if exists "messages_update_own" on public.messages;
revoke update, delete on table public.messages from authenticated;
