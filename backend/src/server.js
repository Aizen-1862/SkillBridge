import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createClient } from '@supabase/supabase-js'
const app=express(), port=Number(process.env.PORT||4000)
const origins=(process.env.FRONTEND_ORIGIN||'http://localhost:5173').split(',').map(x=>x.trim())
const sb=process.env.SUPABASE_URL&&process.env.SUPABASE_ANON_KEY?createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY):null
app.disable('x-powered-by'); app.use(helmet()); app.use(cors({origin(o,cb){if(!o||origins.includes(o))return cb(null,true);cb(new Error('Origin not allowed'))}})); app.use(express.json({limit:'1mb'})); app.use('/api/',rateLimit({windowMs:60000,limit:100}))
app.get('/api/v1/health',(_req,res)=>res.json({ok:true,service:'skillbridge-api',timestamp:new Date().toISOString()}))
app.get('/api/v1/me',async(req,res)=>{if(!sb)return res.status(503).json({error:'Auth not configured'});const token=(req.headers.authorization||'').replace(/^Bearer /,'');if(!token)return res.status(401).json({error:'Authentication required'});const {data,error}=await sb.auth.getUser(token);if(error||!data.user)return res.status(401).json({error:'Invalid session'});res.json({id:data.user.id,email:data.user.email})})
app.use((err,_req,res,_next)=>res.status(err.message==='Origin not allowed'?403:500).json({error:err.message==='Origin not allowed'?'Origin not allowed':'Internal server error'}))
app.listen(port,()=>console.log('SkillBridge API listening on '+port))
