import './build.mjs';
import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync} from 'node:fs';
import {networkInterfaces} from 'node:os';
const {default:worker}=await import('../dist/server/index.js');
const port=Number(process.env.PORT||3000);
mkdirSync('data',{recursive:true});
const sqlite=new DatabaseSync('data/rooms.sqlite');
sqlite.exec('PRAGMA journal_mode=WAL;');
sqlite.exec(readFileSync('database/schema.sql','utf8'));
const DB={prepare(sql){let values=[];return {bind(...v){values=v;return this;},async first(){return sqlite.prepare(sql).get(...values)||null;},async run(){const r=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)}};}};}};
const server=createServer(async(req,res)=>{
 try{let body='';for await(const c of req){body+=c;if(body.length>8192){res.writeHead(413);res.end('Request too large');return;}}
 const host=req.headers.host||'localhost:'+port;
 const r=await worker.fetch(new Request('http://'+host+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body}:{} )}),{DB});
 res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));
 }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'The service is temporarily unavailable. Please try again.'}));}
});
server.listen(port,'0.0.0.0',()=>{console.log('Body Council: http://localhost:'+port);for(const list of Object.values(networkInterfaces()))for(const n of list||[])if(n.family==='IPv4'&&!n.internal)console.log('Phones on the same Wi-Fi can open: http://'+n.address+':'+port);});
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>server.close(()=>{sqlite.close();process.exit(0);}));
