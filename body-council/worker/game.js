export const ROLES = [
 {id:'physician',name:'Physician',title:'The Interpreter',ability:'Assess risk · Stabilize the body',power:{name:'Stabilize',description:'Prevent one health loss at this round resolution, even without a care action.'}},
 {id:'analyst',name:'Analyst',title:'The Truth Seeker',ability:'Read evidence · Accelerate discovery',power:{name:'Rapid assay',description:'Receive a diagnostic result now for free. If already diagnosed, receive a fresh follow-up instead.'}},
 {id:'pharmacist',name:'Pharmacist',title:'The Remedy Keeper',ability:'Match remedies · Protect normal flora',power:{name:'Flora guard',description:'Prevent the normal-flora loss from one remedy used this round.'}},
 {id:'caregiver',name:'Caregiver',title:'The Body Witness',ability:'Listen closely · Offer comfort',power:{name:'Comfort',description:'Restore 1 health now, up to the maximum of 10.'}},
 {id:'microbiologist',name:'Microbiologist',title:'The Culture Reader',ability:'Study bacteria · Identify the cause',power:{name:'Culture reading',description:'Privately identify X or Y without an action point. This does not complete the shared diagnostic test.'}},
 {id:'prevention',name:'Prevention Officer',title:'The Watchkeeper',ability:'Anticipate spread · Contain growth',power:{name:'Containment',description:'Prevent bacterial growth at this round resolution. This does not remove existing bacteria or prevent health loss.'}},
 {id:'resources',name:'Resource Manager',title:'The Quartermaster',ability:'Coordinate supplies · Expand options',power:{name:'Extra supply',description:'Add 1 shared action point this round. The team may propose two or three different basic actions.'}},
 {id:'researcher',name:'Researcher',title:'The Field Scholar',ability:'Observe patterns · Record hidden changes',power:{name:'Field notes',description:'Privately read current bacterial load and normal flora for free, even before diagnosis.'}}
];
export const ACTIONS={test:'Diagnostic test',rush:'Expedite test',A:'Remedy A',B:'Remedy B',care:'Observe & care',review:'Follow-up'};
const uid=()=>crypto.randomUUID();
function say(s,who,text){s.chat.push({id:uid(),who,text,round:s.round});s.chat=s.chat.slice(-100);}
export function dealRoles(s,rng=Math.random){
 const deck=ROLES.map((_,i)=>i);
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 s.budget=2;s.effects={};
 s.players.forEach((p,i)=>{p.role=deck[i];p.powerUsed=false;});
 s.draws.push({round:s.round,seats:s.players.map(p=>({name:p.name,role:ROLES[p.role].id}))});
}
export function createRoom(name,mode='room'){
 const s={rulesVersion:3,phase:'lobby',round:0,players:[],health:6,load:3,flora:5,pathogen:Math.random()<.5?'X':'Y',tested:false,pending:null,reports:[],draws:[],history:[],chat:[],proposal:null,last:null,mode,budget:2,effects:{}};
 const token=joinRoom(s,name);
 if(mode==='demo'){for(let i=1;i<4;i++)joinRoom(s,'Practice partner '+i,uid(),true);start(s);}
 return {s,token};
}
export function upgradeRoom(s){
 if(s.rulesVersion===3)return false;
 if(s.rulesVersion===2){
  s.rulesVersion=3;
  for(const m of s.chat.filter(m=>m.round===s.round)){
   for(const p of s.players)if(p.role!==null&&m.who===p.name+' · '+ROLES[p.role].name)m.who=p.name;
   if(m.text.startsWith('Activated '))m.text='Activated a special power. The role and power remain private until this round ends.';
  }
  say(s,'Council','Roles are now private until the end of each round. Any identities you learned earlier are still prior knowledge.');
  return true;
 }

 const oldAnalyst=s.players.find(p=>p.role===2);
 for(const p of s.players){p.evidence=p===oldAnalyst?(s.reports||[]).map(r=>({...r,sampledRound:r.round})):[];p.powerUsed=false;p.role=null;}
 s.rulesVersion=3;s.proposal=null;s.budget=2;s.effects={};s.draws=[];
 s.pending=s.pending?{token:(oldAnalyst||s.players[0]).token,load:s.load,sampledRound:s.round}:null;
 if(s.phase!=='lobby')dealRoles(s);
 say(s,'Council','Eight-role edition enabled. Body state and prior evidence are preserved. Four new roles are drawn each round.');
 return true;
}
export function joinRoom(s,name,token=uid(),bot=false){
 if(s.phase!=='lobby'||s.players.length>=4)throw Error('This room is full or the game has started.');
 s.players.push({token,name:String(name||'Traveler').trim().slice(0,16)||'Traveler',role:null,bot,powerUsed:false,evidence:[]});return token;
}
function start(s){
 if(s.players.length!==4)throw Error('All four players must be seated first.');
 s.phase='play';s.round=1;dealRoles(s);
 say(s,'Council','Round 1 begins. Four roles were drawn from eight. Every player can propose any basic action. Use your power before voting.');bots(s);
}
function giveReport(s,p,kind='test',sample={load:s.load,sampledRound:s.round}){
 const r={kind,round:s.round,sampledRound:sample.sampledRound,load:sample.load,...(kind==='test'||kind==='culture'?{pathogen:s.pathogen}:{flora:s.flora})};
 p.evidence.push(r);s.reports.push({...r,recipient:p.token});
 if(kind==='test'){s.tested=true;s.pending=null;}
}
function bots(s){
 for(const p of s.players.filter(p=>p.bot)){
  const tips=[
   'Symptoms alone cannot establish the cause. Everyone can arrange a diagnostic test.',
   'A basic test returns next round to the player who proposed it, whatever their next role.',
   'A matches X and B matches Y. Either remedy affects normal flora in this game.',
   'We should discuss how the body feels and what evidence supports our plan.',
   'Our cause stays fixed, even when our roles change.',
   'Care can prevent health loss, but does not itself remove bacteria.',
   'We normally have two shared action points. Every seat can propose the plan.',
   'A follow-up is a snapshot, not a permanent live reading.'
  ];
  say(s,p.name,tips[p.role]);
  const evidence=[...p.evidence].reverse().find(r=>r.pathogen);
  if(evidence)say(s,p.name,'My retained evidence identifies bacterium '+evidence.pathogen+'. Evidence stays with the player after a role change.');
 }
}
export function usePower(s,p){
 if(p.powerUsed)throw Error('You already used your power this round.');
 if(s.proposal)throw Error('Finish voting before activating a power.');
 if(p.role===null||!ROLES[p.role])throw Error('Your role has not been drawn yet.');
 const role=ROLES[p.role];p.powerUsed=true;
 switch(role.id){
  case 'physician':s.effects.stabilize=true;break;
  case 'analyst':giveReport(s,p,s.tested?'review':'test');break;
  case 'pharmacist':s.effects.floraGuard=true;break;
  case 'caregiver':s.health=Math.min(10,s.health+1);break;
  case 'microbiologist':giveReport(s,p,'culture');break;
  case 'prevention':s.effects.containment=true;break;
  case 'resources':s.budget=3;break;
  case 'researcher':giveReport(s,p,'review');break;
 }
 say(s,p.name,'Activated a special power. The role and power remain private until this round ends.');
}
export function validatePlan(s,actions){
 if(!Array.isArray(actions)||actions.length<2||actions.length>(s.budget||2)||new Set(actions).size!==actions.length||actions.some(a=>!ACTIONS[a]))throw Error('Choose two different actions, or three when Extra supply is active.');
 if(actions.includes('A')&&actions.includes('B'))throw Error('Use at most one remedy per round.');
 if(actions.includes('test')&&(s.tested||s.pending))throw Error('A diagnostic test is already pending or complete.');
 if(actions.includes('rush')&&(!actions.includes('test')||s.tested))throw Error('Choose Expedite together with a new diagnostic test.');
 if(actions.includes('review')&&!s.tested)throw Error('A basic follow-up is available after the first diagnostic result.');
}
export function resolve(s,actions,recipientToken=s.players[0].token){
 validatePlan(s,actions);const recipient=s.players.find(p=>p.token===recipientToken);if(!recipient)throw Error('The proposing player is unavailable.');
 const before={health:s.health,load:s.load,flora:s.flora};
 if(actions.includes('test')){const sample={token:recipientToken,load:s.load,sampledRound:s.round};s.pending=sample;if(actions.includes('rush'))giveReport(s,recipient,'test',sample);}
 if(actions.includes('review'))giveReport(s,recipient,'review');
 const drug=actions.includes('A')?'A':actions.includes('B')?'B':null;
 const effective=drug===(s.pathogen==='X'?'A':'B');
 if(before.load===0)s.health++;
 else if(effective){s.load=Math.max(0,s.load-2);s.health++;}
 else{if(!s.effects.containment)s.load++;if(!actions.includes('care')&&!s.effects.stabilize)s.health--;}
 if(drug&&!s.effects.floraGuard)s.flora=Math.max(0,s.flora-1);
 s.health=Math.max(0,Math.min(10,s.health));
 s.last={round:s.round,actions,before,after:{health:s.health,load:s.load,flora:s.flora},drug,powers:s.players.filter(p=>p.powerUsed).map(p=>({name:p.name,role:ROLES[p.role].name,power:ROLES[p.role].power.name}))};s.history.push(s.last);
 say(s,'Council','Round '+s.round+' resolved: '+actions.map(a=>ACTIONS[a]).join(' + ')+'. Health '+before.health+' → '+s.health+'.');s.proposal=null;
 if(s.round===3){s.phase='end';say(s,'Council','Three rounds complete. The full case and body state are revealed. The end of play does not imply the end of treatment.');}
 else{
  s.round++;dealRoles(s);
  if(s.pending){const pending=s.pending;giveReport(s,s.players.find(p=>p.token===pending.token),'test',pending);}
  say(s,'Council','Round '+s.round+' begins. Four roles are freshly drawn; powers reset. Previous evidence and body changes remain. Your new role is private until this round ends.');bots(s);
 }
}
function information(s,p){
 const role=ROLES[p.role];const tips={
  physician:'Fever and fatigue do not establish a cause. Ask who holds evidence before recommending a remedy.',
  analyst:'Anyone can request a test. The proposing player receives its result next round, even after changing role.',
  pharmacist:'Remedy A matches X; Remedy B matches Y. Each normally costs 1 normal-flora unit. Flora guard can prevent that cost this round.',
  caregiver:s.health<6?'The body feels worse than at the start. Ask which evidence explains the change.':s.health>6?'The body feels better, but symptoms alone cannot establish what remains.':'The body still feels feverish and tired. Stability is not proof of recovery.',
  microbiologist:'The cause is fixed for this case. Your culture reading identifies it privately without completing a basic test.',
  prevention:'Without an effective remedy, bacteria normally grow by 1. Containment can prevent that growth; it does not remove existing bacteria.',
  resources:'Two shared action points are available by default. Extra supply adds one for this round only. Any player can propose the extra action.',
  researcher:'Bacterial load and normal flora may change differently. Your Field notes give a private snapshot without requiring a prior test.'
 };
 const cards=[{label:'Round '+s.round+' · '+role.name,text:tips[role.id]},{label:'Shared tools, personal power',text:'Every seat can propose any basic action. A matches X; B matches Y. This round you can use '+role.power.name+' once. Evidence already received stays with you when roles change.'}];
 for(const r of p.evidence)cards.push({label:'Retained evidence · Round '+r.sampledRound+' · '+(r.kind==='test'?'Diagnostic result':r.kind==='culture'?'Culture reading':'Follow-up'),text:r.pathogen?'Detected bacterium '+r.pathogen+(r.kind==='test'?'; bacterial load at sampling: '+r.load+' units.':'.')+' Keep or share this evidence. It remains yours after a new role is drawn.':'Bacterial load at review: '+r.load+' units; normal flora: '+r.flora+' units. This snapshot was taken before any later resolution.'});
 return cards;
}
export function view(s,token){
 const me=s.players.find(p=>p.token===token);if(!me)throw Error('Your seat was not found. Please join again.');
 const pubRole=p=>p.role===null?null:ROLES[p.role];
 return {rulesVersion:3,phase:s.phase,round:s.round,mode:s.mode,budget:s.budget,roleDeck:ROLES,draws:s.draws.filter(d=>s.phase==='end'||d.round<s.round),health:s.health,symptom:s.load>=4?'Symptoms worsening':s.load>=2?'Still unwell':s.load===1?'Symptoms easing':'Symptoms improved',tested:s.tested,pending:!!s.pending,me:{name:me.name,role:pubRole(me),powerUsed:me.powerUsed,host:s.players[0].token===token},players:s.players.map(p=>({name:p.name,role:p.role===null?null:(p.token===token||s.phase==='end'?pubRole(p):{id:'hidden',name:'Hidden role'}),powerUsed:p.powerUsed,bot:p.bot})),cards:s.phase==='lobby'?[]:information(s,me),chat:s.chat,proposal:s.proposal?{id:s.proposal.id,by:s.proposal.by,actions:s.proposal.actions,yes:s.proposal.votes.filter(v=>v.yes).length,no:s.proposal.votes.filter(v=>!v.yes).length,myVote:s.proposal.votes.find(v=>v.token===token)?.yes??null}:null,history:s.history.map(h=>s.phase==='end'?h:{round:h.round,actions:h.actions,powers:h.powers,before:{health:h.before.health},after:{health:h.after.health}}),reveal:s.phase==='end'?{pathogen:s.pathogen,load:s.load,flora:s.flora,initialLoad:3,initialFlora:5}:null};
}
export function operate(s,token,b){
 const p=s.players.find(p=>p.token===token);if(!p)throw Error('Your seat is no longer valid. Please join again.');
 if(b.op==='chat'){const t=String(b.text||'').trim().slice(0,350);if(!t)throw Error('Write a message first.');say(s,p.name,t);return;}
 if(b.op==='start'){if(s.players[0].token!==token||s.phase!=='lobby')throw Error('Only the host can start from the waiting room.');start(s);return;}
 if(s.phase!=='play')throw Error('This action is not available now.');
 if(b.round!==s.round)throw Error('The round has changed. Check your new role and information.');
 if(b.op==='power'){usePower(s,p);return;}
 if(b.op==='propose'){
  if(s.proposal)throw Error('Vote on the current proposal first.');validatePlan(s,b.actions);
  s.proposal={id:uid(),by:p.name,byToken:token,actions:b.actions,votes:[{token,yes:true}]};
  for(const bot of s.players.filter(x=>x.bot))s.proposal.votes.push({token:bot.token,yes:true});
  say(s,'Council',p.name+' proposes: '+b.actions.map(a=>ACTIONS[a]).join(' + ')+'.');
 }else if(b.op==='vote'){
  if(!s.proposal||b.proposalId!==s.proposal.id)throw Error('The proposal has changed.');
  if(typeof b.yes!=='boolean')throw Error('Choose to support or oppose.');
  if(s.proposal.votes.some(v=>v.token===token))throw Error('You have already voted.');s.proposal.votes.push({token,yes:b.yes});
 }else throw Error('Unknown action.');
 if(s.proposal?.votes.filter(v=>v.yes).length>=3)resolve(s,s.proposal.actions,s.proposal.byToken);
 else if(s.proposal?.votes.filter(v=>!v.yes).length>=2){say(s,'Council','The proposal did not pass. Discuss your reasons, then propose again.');s.proposal=null;}
}
