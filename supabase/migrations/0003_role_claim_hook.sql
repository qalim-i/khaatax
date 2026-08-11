-- Custom Access Token Hook: projects public.users.role onto the JWT as a
-- top-level `role` claim, which the RLS policies in 0001 read via
-- auth.jwt() ->> 'role' (TRD Section 5.1). Must be wired up in the dashboard
-- after running this migration — see README in this folder.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role text;
begin
  select role into user_role from public.users where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if user_role is not null then
    claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
  end if;

  return jsonb_build_object('claims', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant select on table public.users to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
