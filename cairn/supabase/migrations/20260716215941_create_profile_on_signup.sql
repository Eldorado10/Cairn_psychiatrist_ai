-- Create the public profile in the same transaction as the Auth user.
-- The function needs elevated privileges because Supabase Auth inserts as
-- supabase_auth_admin, which cannot write to public tables directly.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user()
  from public, anon, authenticated, service_role;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profile creation belongs to the trigger. Authenticated clients only need
-- to read and edit their own row through the existing RLS policies.
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.profiles to service_role;
