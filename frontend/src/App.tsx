import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Bookmark, Compass, FolderKanban, GraduationCap, LayoutDashboard, LogOut, Menu, Plus, Search, ShieldCheck, Users, X } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type Modal = 'auth' | 'project' | 'apply' | 'profile' | 'verify' | null
type Project = { id:string; creator_id:string; title:string; summary:string; description:string; experience_level:string; source_type:string; duration_label:string|null; compensation_type:string; team_capacity:number; status:string; project_skills?:{skill_id:string;skills?:{name:string}|null}[] }
const nav = [{label:'Overview',icon:LayoutDashboard},{label:'Explore projects',icon:Compass},{label:'My projects',icon:FolderKanban},{label:'My applications',icon:Users}]
const blankProfile = {full_name:'',headline:'',bio:'',course:'',branch:'',study_year:''}

export default function App() {
 const [active,setActive]=useState('Overview'),[modal,setModal]=useState<Modal>(null),[user,setUser]=useState<any>(null),[profile,setProfile]=useState<any>(null)
 const [projects,setProjects]=useState<Project[]>([]),[applications,setApplications]=useState<any[]>([]),[query,setQuery]=useState(''),[skill,setSkill]=useState('All skills'),[menu,setMenu]=useState(false)
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[authMode,setAuthMode]=useState<'signup'|'login'>('signup')
 const [authForm,setAuthForm]=useState({name:'',email:'',password:''}),[profileForm,setProfileForm]=useState(blankProfile)
 const [projectForm,setProjectForm]=useState({title:'',summary:'',description:'',experience_level:'beginner',duration_label:'',team_capacity:'4',compensation_type:'unpaid',skills:''})
 const [applicationText,setApplicationText]=useState(''),[verifyMethod,setVerifyMethod]=useState('college_email'),[selectedProject,setSelectedProject]=useState<Project|null>(null)

 async function loadData(u:any) {
  if(!supabase)return
  const [pr,ps,ap]=await Promise.all([
   supabase.from('profiles').select('*').eq('id',u.id).maybeSingle(),
   supabase.from('projects').select('*, project_skills(skill_id, skills(name))').order('created_at',{ascending:false}).limit(60),
   supabase.from('applications').select('*, projects(title, summary)').eq('applicant_id',u.id).order('created_at',{ascending:false})
  ])
  if(pr.data){setProfile(pr.data);setProfileForm({full_name:pr.data.full_name||'',headline:pr.data.headline||'',bio:pr.data.bio||'',course:pr.data.course||'',branch:pr.data.branch||'',study_year:pr.data.study_year?String(pr.data.study_year):''})}
  if(ps.data)setProjects(ps.data as Project[])
  if(ap.data)setApplications(ap.data)
 }
 useEffect(()=>{
  if(!supabase)return
  let alive=true
  supabase.auth.getSession().then(({data})=>{
   if(!alive)return
   const u=data.session?.user??null;setUser(u)
   if(u)void loadData(u)
   else supabase!.from('projects').select('*, project_skills(skill_id, skills(name))').eq('status','published').order('created_at',{ascending:false}).limit(60).then(({data:rows})=>{if(alive&&rows)setProjects(rows as Project[])})
  })
  const {data:listener}=supabase.auth.onAuthStateChange((_e,session)=>{const u=session?.user??null;setUser(u);if(u)void loadData(u);else{setProfile(null);setApplications([])}})
  return()=>{alive=false;listener.subscription.unsubscribe()}
 },[])
 const visible=useMemo(()=>{
  let rows=projects
  if(active==='My projects')rows=rows.filter(p=>p.creator_id===user?.id)
  if(active==='Explore projects')rows=rows.filter(p=>p.status==='published')
  return rows.filter(p=>{const names=(p.project_skills||[]).map(s=>s.skills?.name||'').join(' ');return(p.title+' '+p.summary+' '+p.description+' '+names).toLowerCase().includes(query.toLowerCase())&&(skill==='All skills'||names.toLowerCase().includes(skill.toLowerCase()))})
 },[projects,active,user,query,skill])
 function open(m:Modal){setMessage('');setModal(m)}
 async function auth(){
  if(!supabase)return setMessage('Supabase is not configured yet.')
  setBusy(true);setMessage('')
  const r=authMode==='signup'?await supabase.auth.signUp({email:authForm.email,password:authForm.password,options:{data:{full_name:authForm.name.trim()}}}):await supabase.auth.signInWithPassword({email:authForm.email,password:authForm.password})
  setBusy(false)
  if(r.error)setMessage(r.error.message)
  else if(authMode==='signup'&&!r.data.session)setMessage('Account created. Check your inbox to confirm your email, then sign in.')
  else{setUser(r.data.user);if(r.data.user)await loadData(r.data.user);setModal(null)}
 }
 async function signOut(){if(supabase)await supabase.auth.signOut();setUser(null);setProfile(null);setActive('Overview')}
 async function saveProfile(){
  if(!supabase||!user)return
  setBusy(true);const r=await supabase.from('profiles').update({full_name:profileForm.full_name.trim(),headline:profileForm.headline.trim(),bio:profileForm.bio.trim(),course:profileForm.course.trim(),branch:profileForm.branch.trim(),study_year:profileForm.study_year?Number(profileForm.study_year):null}).eq('id',user.id).select().single()
  setBusy(false);if(r.error)setMessage(r.error.message);else{setProfile(r.data);setModal(null)}
 }
 async function verify(){
  if(!supabase||!user){open('auth');return}
  setBusy(true);const r=await supabase.from('verification_requests').insert({user_id:user.id,method:verifyMethod,status:'pending'})
  setBusy(false);if(r.error)setMessage(r.error.message);else{setProfile({...profile,verification_status:'pending'});setModal(null);setMessage('Verification request submitted for review.')}
 }
 async function createProject(){
  if(!supabase||!user)return open('auth')
  if(profile?.verification_status!=='verified'){setMessage('Complete student verification before publishing a project.');return}
  setBusy(true);setMessage('')
  const r=await supabase.from('projects').insert({creator_id:user.id,title:projectForm.title.trim(),summary:projectForm.summary.trim(),description:projectForm.description.trim(),experience_level:projectForm.experience_level,duration_label:projectForm.duration_label.trim()||null,team_capacity:Number(projectForm.team_capacity),compensation_type:projectForm.compensation_type,status:'published',source_type:'student'}).select().single()
  if(r.error)setMessage(r.error.message)
  else{
   const names=projectForm.skills.split(',').map(x=>x.trim()).filter(Boolean)
   for(const name of names){let s=await supabase.from('skills').select('id').eq('name',name).maybeSingle();if(!s.data){s=await supabase.from('skills').insert({name}).select('id').single()}if(s.data)await supabase.from('project_skills').insert({project_id:r.data.id,skill_id:s.data.id})}
   setProjects([r.data as Project,...projects]);setProjectForm({title:'',summary:'',description:'',experience_level:'beginner',duration_label:'',team_capacity:'4',compensation_type:'unpaid',skills:''});setModal(null)
  }
  setBusy(false)
 }
 async function apply(){
  if(!supabase||!user)return open('auth')
  if(profile?.verification_status!=='verified'){setMessage('Verify your student status before applying.');return}
  if(!selectedProject)return
  setBusy(true);const r=await supabase.from('applications').insert({project_id:selectedProject.id,applicant_id:user.id,introduction:applicationText.trim()})
  setBusy(false);if(r.error)setMessage(r.error.code==='23505'?'You have already applied to this project.':r.error.message)
  else{setApplications([{id:crypto.randomUUID(),project_id:selectedProject.id,status:'pending',projects:{title:selectedProject.title}},...applications]);setModal(null);setApplicationText('')}
 }
 const status=profile?.verification_status||'unverified'
 const skillNames=Array.from(new Set(projects.flatMap(p=>(p.project_skills||[]).map(s=>s.skills?.name).filter(Boolean)))) as string[]
 return <div className="shell">
  <aside className={menu?'sidebar open':'sidebar'}><div className="brand"><b>S</b> SkillBridge <button className="mobile-close" onClick={()=>setMenu(false)}><X/></button></div><small>WORKSPACE</small>
   {nav.map(n=><button key={n.label} className={active===n.label?'nav active':'nav'} onClick={()=>{setActive(n.label);setMenu(false)}}><n.icon size={18}/>{n.label}</button>)}
   <button className="nav" onClick={()=>open('profile')}><GraduationCap size={18}/>My profile</button><button className="nav" onClick={()=>open('verify')}><ShieldCheck size={18}/>Verification</button>
   <div className="side-bottom"><b>Build your future</b><p>Find a real project, learn with a team, and showcase what you make.</p><button onClick={()=>setActive('Explore projects')}>Explore projects ↗</button><hr/><b>{profile?.full_name||user?.email||'Welcome, builder'}</b><small>{status==='verified'?'Verified student':'Student account'}</small></div>
  </aside>
  {menu&&<button className="scrim" onClick={()=>setMenu(false)}/>}
  <main><header><button className="menu" onClick={()=>setMenu(true)}><Menu/></button><span>Workspace　/　<b>{active}</b></span><div><em>{isSupabaseConfigured?'Supabase connected':'Preview mode'}</em>{user?<button className="avatar" title="Sign out" onClick={signOut}><LogOut size={15}/></button>:<button className="primary" onClick={()=>open('auth')}>Sign in</button>}</div></header>
   <section className="content"><div className="welcome"><div><small>LEARN · BUILD · COLLABORATE · GROW</small><h1>{active==='Overview'?'Welcome'+(profile?.full_name?', '+profile.full_name.split(' ')[0]:' , builder')+'.':active}</h1><p>Discover student projects, meet collaborators and turn ideas into experience.</p></div><button className="primary" onClick={()=>user?open('project'):open('auth')}><Plus size={17}/> Publish a project</button></div>
    {!user&&<div className="notice"><ShieldCheck size={18}/><span>Explore public projects. Sign in to build your profile, apply and collaborate.</span><button onClick={()=>open('auth')}>Create account</button></div>}
    {user&&status!=='verified'&&<div className="notice"><ShieldCheck size={18}/><span>{status==='pending'?'Your student verification is awaiting review.':'Verify your student status to publish projects and apply.'}</span><button onClick={()=>open('verify')}>{status==='pending'?'View status':'Verify student status'}</button></div>}
    <div className="stats"><article><FolderKanban/><small>Projects available</small><strong>{projects.filter(p=>p.status==='published').length}</strong><p>Live from the platform</p></article><article><Users/><small>My applications</small><strong>{applications.length}</strong><p>Track your progress</p></article><article><GraduationCap/><small>Student verification</small><strong className="stat-word">{status==='verified'?'Verified':status==='pending'?'Pending':'Not yet'}</strong><p>Trust starts with a real profile</p></article></div>
    {active==='My applications'?<><div className="section-title"><div><h2>Your applications</h2><p>Keep track of the projects you have applied to.</p></div></div><div className="stack">{applications.map(a=><article className="application-row" key={a.id}><div><b>{a.projects?.title||'Project application'}</b><small>Submitted {new Date(a.created_at||Date.now()).toLocaleDateString()}</small></div><span className={'status '+a.status}>{a.status}</span></article>)}{!applications.length&&<div className="empty">No applications yet. Explore projects and find a good fit.</div>}</div></>:<>
     <div className="section-title"><div><h2>{active==='My projects'?'Projects you published':'Discover projects'}</h2><p>{active==='My projects'?'Manage the opportunities you have created.':'Find a project that matches what you want to learn.'}</p></div><button onClick={()=>setActive('Explore projects')}>Explore all ↗</button></div>
     <div className="filters"><label><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search projects or skills"/></label><select value={skill} onChange={e=>setSkill(e.target.value)}><option>All skills</option>{skillNames.map(s=><option key={s}>{s}</option>)}</select></div>
     <div className="projects">{visible.map((p,i)=><article className="project" key={p.id}><div className={'art '+['blue','mint','violet'][i%3]}><span>{p.title.slice(0,2).toUpperCase()}</span><small>{p.source_type==='startup'?'Startup project':'Student project'}</small><button title="Save project" onClick={()=>setMessage('Saved-project lists are planned for a later release.')}><Bookmark size={17}/></button></div><div className="project-body"><small>{p.experience_level} · {p.compensation_type}</small><h3>{p.title}</h3><p>{p.summary}</p><div className="tags">{(p.project_skills||[]).map(s=>s.skills?.name).filter(Boolean).map(s=><span key={s}>{s}</span>)}{p.duration_label&&<span>{p.duration_label}</span>}</div><button className="view" onClick={()=>{setSelectedProject(p);open('apply')}}>View project & apply <ArrowUpRight size={15}/></button></div></article>)}{!visible.length&&<div className="empty">{isSupabaseConfigured?'No matching projects yet. Try another search or check back soon.':'Connect Supabase to load live projects.'}</div>}</div>
    </>}
    <div className="banner"><GraduationCap/><div><b>Your skills deserve a place to shine.</b><p>Complete your profile and build a portfolio from real contributions.</p></div><button onClick={()=>user?open('profile'):open('auth')}>Complete profile ↗</button></div><footer>© 2026 SkillBridge · Learn. Build. Collaborate. Grow. <span>Private contact details stay private.</span></footer>
   </section>
  </main>
  {modal&&<div className="backdrop" onClick={()=>setModal(null)}><div className="modal wide" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setModal(null)}>×</button><div className="brand"><b>S</b> SkillBridge</div>
   {modal==='auth'&&<><h2>{authMode==='signup'?'Create your account':'Welcome back'}</h2><p>Start building your student journey.</p>{authMode==='signup'&&<label>Full name<input value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})} placeholder="Your name"/></label>}<label>Email address<input type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="you@college.edu"/></label><label>Password<input type="password" value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} placeholder="At least 8 characters"/></label><button className="primary submit" disabled={busy||!authForm.email||authForm.password.length<8||(authMode==='signup'&&!authForm.name.trim())} onClick={auth}>{busy?'Please wait…':authMode==='signup'?'Create account':'Sign in'}</button><p className="switch">{authMode==='signup'?'Already have an account?':'New to SkillBridge?'} <button onClick={()=>{setAuthMode(authMode==='signup'?'login':'signup');setMessage('')}}>{authMode==='signup'?'Sign in':'Create account'}</button></p></>}
   {modal==='profile'&&<><h2>Your profile</h2><p>Share your learning goals and experience. Keep personal contact details private.</p>{[['full_name','Full name'],['headline','Headline'],['bio','About you'],['course','Course'],['branch','Branch']].map(([k,l])=><label key={k}>{l}{k==='bio'?<textarea rows={3} value={(profileForm as any)[k]} onChange={e=>setProfileForm({...profileForm,[k]:e.target.value})}/>:<input value={(profileForm as any)[k]} onChange={e=>setProfileForm({...profileForm,[k]:e.target.value})}/>}</label>)}<label>Study year<select value={profileForm.study_year} onChange={e=>setProfileForm({...profileForm,study_year:e.target.value})}><option value="">Select year</option>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n}</option>)}</select></label><button className="primary submit" disabled={busy} onClick={saveProfile}>{busy?'Saving…':'Save profile'}</button></>}
   {modal==='verify'&&<><h2>Student verification</h2><p>Verification helps keep SkillBridge focused on genuine student collaboration. Documents are not collected in this first release.</p><div className="verification-state"><ShieldCheck/><div><b>Status: {status}</b><small>Only verification status is shown on your public profile.</small></div></div>{status!=='verified'&&status!=='pending'&&<><label>Verification method<select value={verifyMethod} onChange={e=>setVerifyMethod(e.target.value)}><option value="college_email">College email review</option><option value="manual">Institution review</option></select></label><button className="primary submit" disabled={busy} onClick={verify}>{busy?'Submitting…':'Submit verification request'}</button></>}</>}
   {modal==='project'&&<><h2>Publish a student project</h2><p>Be clear about the work, skills, time commitment and compensation.</p><label>Project title<input value={projectForm.title} onChange={e=>setProjectForm({...projectForm,title:e.target.value})} maxLength={100}/></label><label>Short summary<input value={projectForm.summary} onChange={e=>setProjectForm({...projectForm,summary:e.target.value})} maxLength={240}/></label><label>Project details<textarea rows={4} value={projectForm.description} onChange={e=>setProjectForm({...projectForm,description:e.target.value})}/></label><label>Skills (comma separated)<input value={projectForm.skills} onChange={e=>setProjectForm({...projectForm,skills:e.target.value})} placeholder="React, UI/UX, Python"/></label><div className="form-grid"><label>Experience level<select value={projectForm.experience_level} onChange={e=>setProjectForm({...projectForm,experience_level:e.target.value})}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="all">All levels</option></select></label><label>Team capacity<input type="number" min="1" max="30" value={projectForm.team_capacity} onChange={e=>setProjectForm({...projectForm,team_capacity:e.target.value})}/></label></div><label>Duration<input value={projectForm.duration_label} onChange={e=>setProjectForm({...projectForm,duration_label:e.target.value})} placeholder="e.g. 4 weeks"/></label><label>Compensation<select value={projectForm.compensation_type} onChange={e=>setProjectForm({...projectForm,compensation_type:e.target.value})}><option value="unpaid">Unpaid / learning project</option><option value="paid">Paid (details in description)</option><option value="volunteer">Volunteer</option></select></label><button className="primary submit" disabled={busy||projectForm.title.trim().length<5||projectForm.summary.trim().length<20||!projectForm.description.trim()} onClick={createProject}>{busy?'Publishing…':'Publish project'}</button>{status!=='verified'&&<p className="message">Student verification is required before publishing.</p>}</>}
   {modal==='apply'&&selectedProject&&<><h2>{selectedProject.title}</h2><p>{selectedProject.description}</p><div className="verification-state"><div><b>{selectedProject.experience_level} · {selectedProject.compensation_type}</b><small>{selectedProject.team_capacity} team places · {selectedProject.duration_label||'Flexible duration'}</small></div></div><label>Why would you like to join? (20–2,000 characters)<textarea rows={4} value={applicationText} onChange={e=>setApplicationText(e.target.value)} placeholder="Introduce yourself and what you hope to contribute."/></label><button className="primary submit" disabled={busy||applicationText.trim().length<20} onClick={apply}>{busy?'Submitting…':'Submit application'}</button>{status!=='verified'&&<p className="message">Verify your student status before applying.</p>}</>}
   {message&&<p className="message">{message}</p>}<p className="modal-foot">SkillBridge does not support sharing private contact details in public profiles.</p>
  </div></div>}
 </div>
}
