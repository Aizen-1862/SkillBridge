-- SkillBridge security hardening and query indexes
revoke all on function public.handle_new_user() from public, anon, authenticated;
create index if not exists profiles_college_id_idx on public.profiles(college_id);
create index if not exists projects_creator_id_idx on public.projects(creator_id);
create index if not exists project_skills_skill_id_idx on public.project_skills(skill_id);
create index if not exists applications_applicant_id_idx on public.applications(applicant_id);
create index if not exists verification_requests_user_id_idx on public.verification_requests(user_id);
create index if not exists verification_requests_reviewer_id_idx on public.verification_requests(reviewer_id);
drop policy if exists "Public profiles readable" on public.profiles;
create policy "Public profiles readable" on public.profiles for select using(is_public or id=(select auth.uid()));
drop policy if exists "Own profile insert" on public.profiles;
create policy "Own profile insert" on public.profiles for insert with check(id=(select auth.uid()));
drop policy if exists "Own profile update" on public.profiles;
create policy "Own profile update" on public.profiles for update using(id=(select auth.uid())) with check(id=(select auth.uid()));
drop policy if exists "Visible user skills" on public.user_skills;
create policy "Visible user skills" on public.user_skills for select using(exists(select 1 from public.profiles p where p.id=user_id and (p.is_public or p.id=(select auth.uid()))));
drop policy if exists "Manage own skills" on public.user_skills;
create policy "Insert own skills" on public.user_skills for insert with check(user_id=(select auth.uid()));
create policy "Update own skills" on public.user_skills for update using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "Delete own skills" on public.user_skills for delete using(user_id=(select auth.uid()));
drop policy if exists "Published projects visible" on public.projects;
create policy "Published projects visible" on public.projects for select using(status='published' or creator_id=(select auth.uid()));
drop policy if exists "Verified users create projects" on public.projects;
create policy "Verified users create projects" on public.projects for insert with check(creator_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.verification_status='verified'));
drop policy if exists "Owners update projects" on public.projects;
create policy "Owners update projects" on public.projects for update using(creator_id=(select auth.uid())) with check(creator_id=(select auth.uid()));
drop policy if exists "Owners delete drafts" on public.projects;
create policy "Owners delete drafts" on public.projects for delete using(creator_id=(select auth.uid()) and status='draft');
drop policy if exists "Project skills visible" on public.project_skills;
create policy "Project skills visible" on public.project_skills for select using(exists(select 1 from public.projects p where p.id=project_id and (p.status='published' or p.creator_id=(select auth.uid()))));
drop policy if exists "Project owners manage skills" on public.project_skills;
create policy "Insert project skills" on public.project_skills for insert with check(exists(select 1 from public.projects p where p.id=project_id and p.creator_id=(select auth.uid())));
create policy "Update project skills" on public.project_skills for update using(exists(select 1 from public.projects p where p.id=project_id and p.creator_id=(select auth.uid()))) with check(exists(select 1 from public.projects p where p.id=project_id and p.creator_id=(select auth.uid())));
create policy "Delete project skills" on public.project_skills for delete using(exists(select 1 from public.projects p where p.id=project_id and p.creator_id=(select auth.uid())));
drop policy if exists "Applicant or owner reads applications" on public.applications;
create policy "Applicant or owner reads applications" on public.applications for select using(applicant_id=(select auth.uid()) or exists(select 1 from public.projects p where p.id=project_id and p.creator_id=(select auth.uid())));
drop policy if exists "Verified students apply" on public.applications;
create policy "Verified students apply" on public.applications for insert with check(applicant_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.verification_status='verified' and p.account_type='student') and exists(select 1 from public.projects p where p.id=project_id and p.status='published' and p.creator_id<>(select auth.uid())));
drop policy if exists "Applicants withdraw pending" on public.applications;
drop policy if exists "Project owners review applications" on public.applications;
create policy "Applicants and owners update applications" on public.applications for update using(applicant_id=(select auth.uid()) or exists(select 1 from public.projects p where p.id=project_id and p.creator_id=(select auth.uid()))) with check(applicant_id=(select auth.uid()) or exists(select 1 from public.projects p where p.id=project_id and p.creator_id=(select auth.uid())));
create or replace function public.guard_application_update() returns trigger language plpgsql set search_path=public as $$
begin
 if (select auth.uid())=old.applicant_id then
  if new.applicant_id is distinct from old.applicant_id or new.project_id is distinct from old.project_id or new.introduction is distinct from old.introduction or old.status<>'pending' or new.status not in ('pending','withdrawn') then raise exception 'Applicants may only withdraw their own pending applications'; end if;
 elsif exists(select 1 from public.projects p where p.id=old.project_id and p.creator_id=(select auth.uid())) then
  if new.applicant_id is distinct from old.applicant_id or new.project_id is distinct from old.project_id or new.introduction is distinct from old.introduction or old.status<>'pending' or new.status not in ('accepted','declined') then raise exception 'Project owners may only accept or decline pending applications'; end if;
 else raise exception 'Not authorized to update this application';
 end if;
 return new;
end $$;
drop trigger if exists guard_application_update on public.applications;
create trigger guard_application_update before update on public.applications for each row execute function public.guard_application_update();
drop policy if exists "Read own verification requests" on public.verification_requests;
create policy "Read own verification requests" on public.verification_requests for select using(user_id=(select auth.uid()));
drop policy if exists "Submit own verification request" on public.verification_requests;
create policy "Submit own verification request" on public.verification_requests for insert with check(user_id=(select auth.uid()) and status='pending' and reviewer_id is null and reviewer_note is null and reviewed_at is null);
