import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,joinRoom,operate,view,resolve,validatePlan,ROLES,dealRoles,upgradeRoom} from '../worker/game.js';
function multiplayer(){const {s,token}=createRoom('Ada');s.pathogen='X';const tokens=[token];for(const n of ['Ben','Clio','Dev'])tokens.push(joinRoom(s,n));operate(s,token,{op:'start'});return {s,tokens};}
test('private views contain no other seat credentials or raw hidden case',()=>{
 const {s,tokens}=multiplayer();for(const token of tokens){const v=view(s,token);assert.ok(v.cards.length>=1);assert.equal(v.reveal,null);assert.equal('pathogen' in v,false);assert.equal('load' in v,false);assert.equal('flora' in v,false);for(const secret of tokens)assert.equal(JSON.stringify(v).includes(secret),false);}assert.throws(()=>view(s,'uninvited'));
});
test('any proposer receives evidence and keeps it across new roles; readings use sampling time',()=>{
 const {s,tokens}=multiplayer();s.players.forEach((p,i)=>p.role=[0,3,5,6][i]);
 const recipient=s.players[3];resolve(s,['test','care'],recipient.token);assert.equal(s.round,2);assert.equal(s.health,6);assert.equal(s.load,4);assert.equal(s.tested,true);
 assert.ok(view(s,recipient.token).cards.some(c=>c.text.includes('Detected bacterium X')));
 assert.equal(view(s,tokens[0]).cards.some(c=>c.text.includes('Detected bacterium X')),false);
 assert.equal(recipient.evidence[0].load,3);assert.equal(recipient.evidence[0].sampledRound,1);
 resolve(s,['A','review'],recipient.token);assert.equal(s.reports.at(-1).load,4);assert.equal(s.reports.at(-1).flora,5);assert.equal(s.load,2);assert.equal(s.flora,4);
 assert.ok(view(s,recipient.token).cards.some(c=>c.text.includes('Detected bacterium X')));
 resolve(s,['A','care']);assert.equal(s.phase,'end');assert.equal(s.health,8);assert.equal(s.load,0);assert.equal(s.flora,3);assert.deepEqual(view(s,tokens[0]).reveal,{pathogen:'X',load:0,flora:3,initialLoad:3,initialFlora:5});
});
test('wrong remedy grows bacteria; care prevents health loss but not bacterial growth',()=>{
 const {s}=multiplayer();resolve(s,['B','care']);assert.equal(s.health,6);assert.equal(s.load,4);assert.equal(s.flora,4);resolve(s,['B','test']);assert.equal(s.health,5);assert.equal(s.load,5);assert.equal(s.flora,3);
});
test('three distinct positive votes execute once; duplicates and stale rounds are rejected',()=>{
 const {s,tokens}=multiplayer();operate(s,tokens[0],{op:'propose',round:1,actions:['test','care']});const id=s.proposal.id;
 assert.throws(()=>operate(s,tokens[0],{op:'vote',round:1,proposalId:id,yes:true}));operate(s,tokens[1],{op:'vote',round:1,proposalId:id,yes:true});assert.equal(s.round,1);
 operate(s,tokens[2],{op:'vote',round:1,proposalId:id,yes:true});assert.equal(s.round,2);assert.equal(s.history.length,1);assert.throws(()=>operate(s,tokens[3],{op:'vote',round:1,proposalId:id,yes:true}));assert.equal(s.history.length,1);
});
test('two opposing votes reopen discussion without spending actions',()=>{
 const {s,tokens}=multiplayer();operate(s,tokens[0],{op:'propose',round:1,actions:['test','care']});const id=s.proposal.id;for(const t of tokens.slice(1,3))operate(s,t,{op:'vote',round:1,proposalId:id,yes:false});assert.equal(s.proposal,null);assert.equal(s.round,1);assert.equal(s.history.length,0);
});
test('invalid action combinations and unauthorized starts are rejected',()=>{
 const {s}=multiplayer();for(const a of [['A','B'],['care','care'],['review','care'],['rush','care'],['unknown','test']])assert.throws(()=>validatePlan(s,a));const room=createRoom('Host');joinRoom(room.s,'Guest','guest');assert.throws(()=>operate(room.s,'guest',{op:'start'}));assert.throws(()=>operate(room.s,room.token,{op:'start'}));
});
test('scripted practice partners allow a complete three-round practice game',()=>{
 const {s,token}=createRoom('Practice','demo');assert.equal(s.players.filter(p=>p.bot).length,3);operate(s,token,{op:'propose',round:1,actions:['test','care']});const drug=s.pathogen==='X'?'A':'B';for(const round of [2,3])operate(s,token,{op:'propose',round,actions:[drug,'care']});assert.equal(view(s,token).phase,'end');
});

test('every round draws four unique roles from the full eight-role deck',()=>{
 const {s}=multiplayer();assert.equal(ROLES.length,8);assert.ok(s.players.every(p=>Number.isInteger(p.role)));assert.equal(new Set(s.players.map(p=>p.role)).size,4);
 const fixed=()=>0;dealRoles(s,fixed);const first=s.players.map(p=>p.role);s.round=2;dealRoles(s,()=>.999);const next=s.players.map(p=>p.role);assert.notDeepEqual(first,next);
 assert.equal(new Set(next).size,4);assert.ok(s.players.every(p=>p.role>=0&&p.role<8));assert.ok(s.players.every(p=>p.powerUsed===false));
 const draw=s.draws.at(-1);assert.equal(draw.round,2);assert.equal(draw.seats.length,4);
});
function withRole(index){const {s,tokens}=multiplayer();s.players[0].role=index;return {s,token:tokens[0],p:s.players[0]};}
function power(s,token){operate(s,token,{op:'power',round:s.round});}
test('Physician prevents a health loss; prevention stops growth but not health loss',()=>{
 const one=withRole(0);power(one.s,one.token);resolve(one.s,['B','test']);assert.equal(one.s.health,6);assert.equal(one.s.load,4);
 const two=withRole(5);power(two.s,two.token);resolve(two.s,['B','test']);assert.equal(two.s.health,5);assert.equal(two.s.load,3);
});
test('Pharmacist guards flora only this round; Caregiver restores bounded health',()=>{
 const one=withRole(2);power(one.s,one.token);resolve(one.s,['A','care']);assert.equal(one.s.flora,5);assert.deepEqual(one.s.effects,{});resolve(one.s,['A','care']);assert.equal(one.s.flora,4);
 const two=withRole(3);two.s.health=9;power(two.s,two.token);assert.equal(two.s.health,10);assert.throws(()=>power(two.s,two.token));
});
test('Analyst reveals evidence only to its player and can later use a follow-up',()=>{
 const {s,token,p}=withRole(1);power(s,token);assert.equal(s.tested,true);assert.ok(view(s,token).cards.some(c=>c.text.includes('Detected bacterium X')));assert.equal(view(s,s.players[1].token).cards.some(c=>c.text.includes('Detected bacterium X')),false);
 resolve(s,['A','care']);p.role=1;power(s,token);assert.equal(p.evidence.at(-1).kind,'review');assert.equal(p.evidence.at(-1).load,1);
});
test('Microbiologist and Researcher reveal distinct private evidence without a diagnostic prerequisite',()=>{
 const one=withRole(4);power(one.s,one.token);assert.equal(one.p.evidence[0].pathogen,'X');assert.equal(one.s.tested,false);
 const two=withRole(7);power(two.s,two.token);assert.equal(two.p.evidence[0].load,3);assert.equal(two.p.evidence[0].flora,5);assert.equal('pathogen' in two.p.evidence[0],false);assert.equal(two.s.tested,false);
});
test('Resource Manager adds one shared point, permits a third action, and resets next round',()=>{
 const {s,token}=withRole(6);assert.throws(()=>validatePlan(s,['A','care','test']));power(s,token);assert.equal(s.budget,3);validatePlan(s,['A','care','test']);resolve(s,['A','care','test']);assert.equal(s.budget,2);assert.throws(()=>validatePlan(s,['A','care','review']));assert.ok(s.players.every(p=>!p.powerUsed));
});
test('powers are locked while voting and stale or repeated power requests are rejected',()=>{
 const {s,token}=withRole(6);operate(s,token,{op:'propose',round:1,actions:['test','care']});assert.throws(()=>power(s,token));assert.equal(s.players[0].powerUsed,false);s.proposal=null;power(s,token);assert.throws(()=>power(s,token));assert.throws(()=>operate(s,token,{op:'power',round:0}));assert.equal(s.budget,3);
});
test('legacy rooms upgrade once, retaining body state, identities and prior private evidence',()=>{
 const {s}=multiplayer();delete s.rulesVersion;s.players.forEach((p,i)=>p.role=i);s.players.forEach(p=>delete p.evidence);s.reports=[{kind:'test',round:1,pathogen:'X',load:3}];const formerAnalyst=s.players[2];s.health=5;s.load=4;
 assert.equal(upgradeRoom(s),true);assert.equal(upgradeRoom(s),false);assert.equal(s.health,5);assert.equal(s.load,4);assert.equal(formerAnalyst.evidence[0].pathogen,'X');assert.equal(s.players.length,4);assert.equal(new Set(s.players.map(p=>p.role)).size,4);
});

test('current role identities stay private in player lists, draws, messages, powers and modifiers',()=>{
 const {s,tokens}=multiplayer();s.players.forEach((p,i)=>p.role=[0,1,6,7][i]);
 power(s,tokens[1]);power(s,tokens[2]);operate(s,tokens[3],{op:'chat',text:'I have a clue.',round:1});
 const v=view(s,tokens[0]);assert.equal(v.me.role.id,'physician');assert.equal(v.roleDeck.length,8);assert.equal(v.draws.length,0);assert.equal('effects' in v,false);
 assert.deepEqual(v.players.slice(1).map(p=>p.role),Array(3).fill({id:'hidden',name:'Hidden role'}));
 assert.equal(v.chat.some(m=>m.who.includes(' · ')),false);assert.equal(v.chat.some(m=>m.text.includes('Activated Rapid assay')||m.text.includes('Activated Extra supply')),false);
 assert.equal(v.cards.some(c=>c.text.includes('Detected bacterium X')),false);assert.ok(view(s,tokens[1]).cards.some(c=>c.text.includes('Detected bacterium X')));
});
test('identities reveal only for completed rounds and all identities reveal at the end',()=>{
 const {s,tokens}=multiplayer();const first=s.draws[0];resolve(s,['test','care']);const v=view(s,tokens[0]);assert.deepEqual(v.draws,[first]);assert.equal(v.players.filter(p=>p.role.id==='hidden').length,3);
 resolve(s,['A','care']);resolve(s,['A','care']);const end=view(s,tokens[0]);assert.equal(end.draws.length,3);assert.equal(end.players.some(p=>p.role.id==='hidden'),false);
});
test('eight-role saved rooms gain hidden identities without changing their existing draw or evidence',()=>{
 const {s,tokens}=multiplayer();s.rulesVersion=2;const roles=s.players.map(p=>p.role);s.players[0].evidence.push({kind:'culture',round:1,sampledRound:1,pathogen:'X',load:3});
 s.chat.push({id:'old',round:1,who:s.players[0].name+' · '+ROLES[s.players[0].role].name,text:'Activated '+ROLES[s.players[0].role].power.name+'.'});
 assert.equal(upgradeRoom(s),true);assert.deepEqual(s.players.map(p=>p.role),roles);assert.equal(s.players[0].evidence.length,1);assert.equal(view(s,tokens[1]).players[0].role.id,'hidden');assert.equal(s.chat.find(m=>m.id==='old').who,s.players[0].name);assert.equal(upgradeRoom(s),false);
});
