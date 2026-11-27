-- Keep profile verification status synchronized with submitted and reviewed requests.
-- Only privileged database workflows may change verification_status/account_type.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated','anon')
     and auth.uid() = old.id
     and (
       new.verification_status is distinct from old.verification_status
       or new.account_type is distinct from old.account_type
     ) then
    raise exception 'Privileged profile fields require an authorized workflow';
  end if;
  return new;
end;
$$;

create or replace function public.sync_verification_status_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    update public.profiles
       set verification_status = 'pending'
     where id = new.user_id
       and verification_status in ('unverified','rejected');
  elsif new.status = 'approved' then
    update public.profiles
       set verification_status = 'verified'
     where id = new.user_id;
  elsif new.status = 'rejected' then
    update public.profiles
       set verification_status = 'rejected'
     where id = new.user_id;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_verification_status_to_profile() from public, anon, authenticated;

drop trigger if exists sync_verification_status_to_profile on public.verification_requests;
create trigger sync_verification_status_to_profile
after insert or update of status on public.verification_requests
for each row execute function public.sync_verification_status_to_profile();
