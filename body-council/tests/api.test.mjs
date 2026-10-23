import '../scripts/build.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
const {default:worker}=await import('../dist/server/index.js');
function server(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('database/schema.sql','utf8'));const DB={prepare(sql){let values=[];return {bind(...v){values=v;return this;},async first(){return sqlite.prepare(sql).get(...values)||null;},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}};}};}};return {sqlite,async call(body,token,code){const req=new Request('http://localhost/api'+(!body?'?code='+code:''),{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const r=await worker.fetch(req,{DB});return {status:r.status,data:await r.json()};}};}
test('room API supports concurrent joins, four separate seats, voting and private responses',async()=>{
 const api=server();try{const created=await api.call({op:'create',name:'Host'});assert.equal(created.status,200);const {code,token}=created.data;
 const joined=await Promise.all(['Two','Three','Four'].map(name=>api.call({op:'join',name,code})));assert.ok(joined.every(r=>r.status===200));assert.equal((await api.call({op:'join',name:'Fifth',code})).status,400);
 const start=await api.call({op:'start',code},token);assert.equal(start.data.players.length,4);assert.equal(start.data.round,1);assert.equal((await api.call(null,'invalid',code)).status,400);
 const proposal=await api.call({op:'propose',code,round:1,actions:['test','care']},token);const id=proposal.data.proposal.id;
 const votes=await Promise.all(joined.slice(0,2).map(r=>api.call({op:'vote',code,round:1,proposalId:id,yes:true},r.data.token)));assert.ok(votes.every(r=>r.status===200));
 const state=(await api.call(null,token,code)).data;assert.equal(state.round,2);assert.equal(state.history.length,1);assert.equal('load' in state,false);assert.equal(state.reveal,null);
 }finally{api.sqlite.close();}
});
test('matchmaking shares an open room, rejects cross-origin mutations and serves English UI',async()=>{
 const api=server();try{const one=await api.call({op:'match',name:'One'}),two=await api.call({op:'match',name:'Two'});assert.equal(one.data.code,two.data.code);assert.notEqual(one.data.token,two.data.token);
 const page=await worker.fetch(new Request('http://localhost/'),{});assert.equal(page.status,200);const html=await page.text();assert.ok(html.includes('lang="en"'));assert.equal(/[\u4e00-\u9fff]/.test(html),false);
 const denied=await worker.fetch(new Request('http://localhost/api',{method:'POST',headers:{Origin:'https://other.example'},body:'{}'}),{DB:{}});assert.equal(denied.status,403);
 }finally{api.sqlite.close();}
});
