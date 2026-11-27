-- SkillBridge MVP schema for Supabase. Run in SQL Editor before enabling real accounts.
create extension if not exists pgcrypto;

create table if not exists public.colleges (
 id uuid primary key default gen_random_uuid(), name text not null, city text, state text,
 approved_email_domains text[] not null default '{}', is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text, headline text, bio text, college_id uuid references public.colleges(id) on delete set null,
 course text, branch text, study_year smallint check(study_year between 1 and 10),
 account_type text not null default 'student' check(account_type in ('student','startup')),
 verification_status text not null default 'unverified' check(verification_status in ('unverified','pending','verified','rejected')),
 avatar_url text, is_public boolean not null default true, created_at timestamptz not null default now()
);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.protect_profile_fields() returns trigger language plpgsql set search_path=public as $$
begin
 if auth.uid()=old.id and (new.verification_status is distinct from old.verification_status or new.account_type is distinct from old.account_type) then
  raise exception 'Privileged profile fields require an authorized workflow';
 end if; return new;
end $$;
drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields before update on public.profiles for each row execute procedure public.protect_profile_fields();

create table if not exists public.skills(id uuid primary key default gen_random_uuid(),name text not null unique,category text);
create table if not exists public.user_skills(user_id uuid references public.profiles(id) on delete cascade,skill_id uuid references public.skills(id) on delete cascade,proficiency text not null default 'beginner' check(proficiency in ('beginner','intermediate','advanced')),primary key(user_id,skill_id));
create table if not exists public.projects(
 id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.profiles(id) on delete restrict,
 title text not null check(char_length(title) between 5 and 100),summary text not null check(char_length(summary) between 20 and 240),description text not null,
 source_type text not null default 'student' check(source_type in ('student','startup')),
 experience_level text not null default 'beginner' check(experience_level in ('beginner','intermediate','advanced','all')),
 duration_label text,team_capacity smallint not null default 4 check(team_capacity between 1 and 30),
 compensation_type text not null default 'unpaid' check(compensation_type in ('paid','unpaid','volunteer','not_applicable')),
 application_deadline timestamptz,status text not null default 'draft' check(status in ('draft','published','paused','completed','archived')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.project_skills(project_id uuid references public.projects(id) on delete cascade,skill_id uuid references public.skills(id) on delete cascade,primary key(project_id,skill_id));
create table if not exists public.applications(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete cascade,
 applicant_id uuid not null references public.profiles(id) on delete cascade,introduction text not null check(char_length(introduction) between 20 and 2000),
 status text not null default 'pending' check(status in ('pending','accepted','declined','withdrawn')),
 created_at timestamptz not null default now(),unique(project_id,applicant_id)
);
create table if not exists public.verification_requests(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 method text not null check(method in ('college_email','student_id','manual')),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 private_document_path text,reviewer_id uuid references public.profiles(id),reviewer_note text,created_at timestamptz not null default now(),reviewed_at timestamptz
);

alter table public.colleges enable row level security;
alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.user_skills enable row level security;
alter table public.projects enable row level security;
alter table public.project_skills enable row level security;
alter table public.applications enable row level security;
alter table public.verification_requests enable row level security;

create policy "Active colleges readable" on public.colleges for select using(is_active);
create policy "Skills readable" on public.skills for select using(true);
create policy "Public profiles readable" on public.profiles for select using(is_public or id=auth.uid());
create policy "Own profile insert" on public.profiles for insert with check(id=auth.uid());
create policy "Own profile update" on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy "Visible user skills" on public.user_skills for select using(exists(select 1 from public.profiles p where p.id=user_id and (p.is_public or p.id=auth.uid())));
create policy "Manage own skills" on public.user_skills for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "Published projects visible" on public.projects for select using(status='published' or creator_id=auth.uid());
create policy "Verified users create projects" on public.projects for insert with check(creator_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.verification_status='verified'));
create policy "Owners update projects" on public.projects for update using(creator_id=auth.uid()) with check(creator_id=auth.uid());
create policy "Owners delete drafts" on public.projects for delete using(creator_id=auth.uid() and status='draft');
create policy "Project skills visible" on public.project_skills for select using(exists(select 1 from public.projects p where p.id=project_id and (p.status='published' or p.creator_id=auth.uid())));
create policy "Project owners manage skills" on public.project_skills for all using(exists(select 1 from public.projects p where p.id=project_id and p.creator_id=auth.uid())) with check(exists(select 1 from public.projects p where p.id=project_id and p.creator_id=auth.uid()));
create policy "Applicant or owner reads applications" on public.applications for select using(applicant_id=auth.uid() or exists(select 1 from public.projects p where p.id=project_id and p.creator_id=auth.uid()));
create policy "Verified students apply" on public.applications for insert with check(applicant_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.verification_status='verified' and p.account_type='student') and exists(select 1 from public.projects p where p.id=project_id and p.status='published' and p.creator_id<>auth.uid()));
create policy "Applicants withdraw pending" on public.applications for update using(applicant_id=auth.uid() and status='pending') with check(applicant_id=auth.uid() and status in ('pending','withdrawn'));
create policy "Project owners review applications" on public.applications for update using(exists(select 1 from public.projects p where p.id=project_id and p.creator_id=auth.uid())) with check(exists(select 1 from public.projects p where p.id=project_id and p.creator_id=auth.uid()));
create policy "Read own verification requests" on public.verification_requests for select using(user_id=auth.uid());
create policy "Submit own verification request" on public.verification_requests for insert with check(user_id=auth.uid());

create index if not exists projects_status_created_idx on public.projects(status,created_at desc);
create index if not exists applications_project_idx on public.applications(project_id,status);
