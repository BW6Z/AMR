import {createRoom,joinRoom,operate,view,upgradeRoom} from './game.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const CODE='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>CODE[v%CODE.length]).join('');
const expire=()=>Date.now()+2*60*60*1000;
async function read(db,code){return db.prepare('SELECT * FROM rooms WHERE code = ? AND expires > ?').bind(code,Date.now()).first();}
async function write(db,row,s){return (await db.prepare('UPDATE rooms SET state = ?, version = version + 1, seats = ?, phase = ?, expires = ? WHERE code = ? AND version = ?').bind(JSON.stringify(s),s.players.length,s.phase,expire(),row.code,row.version).run()).meta.changes===1;}
async function api(req,env){
 if(!env.DB)return json({error:'The multiplayer service is unavailable. Please try again later.'},503);
 const url=new URL(req.url);let b={};
 if(req.method==='POST'){
  if(req.headers.get('Origin')&&req.headers.get('Origin')!==url.origin)return json({error:'Invalid request origin.'},403);
  if(Number(req.headers.get('Content-Length')||0)>4096)return json({error:'The message is too long.'},413);
  const raw=await req.text();if(raw.length>4096)return json({error:'The message is too long.'},413);try{b=JSON.parse(raw);}catch{return json({error:'Invalid request format.'},400);}
 }
 const op=b.op;const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(req.method==='POST'&&['create','match','demo','join'].includes(op)){
  const name=String(b.name||'').trim().slice(0,16);if(!name)return json({error:'Enter your name first.'},400);
  if(op==='join'||op==='match'){
   for(let attempt=0;attempt<7;attempt++){
    const row=op==='join'?await read(env.DB,String(b.code||'').trim().toUpperCase()):await env.DB.prepare("SELECT * FROM rooms WHERE matchmaking = 1 AND phase = 'lobby' AND seats < 4 AND expires > ? ORDER BY expires LIMIT 1").bind(Date.now()).first();
    if(!row){if(op==='join')throw Error('This room was not found or has expired.');break;}
    const s=JSON.parse(row.state);upgradeRoom(s);const t=joinRoom(s,name);if(await write(env.DB,row,s))return json({code:row.code,token:t,state:view(s,t)});
   }
   if(op==='join')return json({error:'The room is busy. Please try joining again.'},409);
  }
  const {s,token:t}=createRoom(name,op==='demo'?'demo':'room');const code=makeCode();
  await env.DB.prepare('INSERT INTO rooms (code,state,matchmaking,seats,phase,expires) VALUES (?,?,?,?,?,?)').bind(code,JSON.stringify(s),op==='match'?1:0,s.players.length,s.phase,expire()).run();
  return json({code,token:t,state:view(s,t)});
 }
 const code=String(url.searchParams.get('code')||b.code||'').toUpperCase();
 if(!token)return json({error:'Join a room first.'},401);
 for(let attempt=0;attempt<7;attempt++){
  const row=await read(env.DB,code);if(!row)return json({error:'This room has expired. Rooms are kept for two hours. Please create a new one.'},404);
  const s=JSON.parse(row.state);
  if(upgradeRoom(s)){await write(env.DB,row,s);continue;}
  if(req.method==='GET')return json(view(s,token));
  operate(s,token,b);if(await write(env.DB,row,s))return json(view(s,token));
 }
 return json({error:'Another player just updated the room. Please try again.'},409);
}
export default {async fetch(req,env){
 const url=new URL(req.url);
 try{if(url.pathname==='/api')return await api(req,env);
 if(url.pathname==='/health')return json({ok:true,database:!!env.DB});
 if(url.pathname==='/favicon.ico')return new Response(null,{status:204});
 if(url.pathname!=='/')return new Response('Not found',{status:404});
 return new Response(HTML,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()'}});
 }catch(e){return json({error:e.message||'Request failed. Please try again.'},400);}
}};
