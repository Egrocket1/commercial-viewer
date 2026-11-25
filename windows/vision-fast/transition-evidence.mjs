// Passive visual evidence only. No TV/receiver APIs, model, policy or audio.
import {mkdir,readdir,readFile,writeFile,stat} from 'node:fs/promises';
import {join,resolve,sep} from 'node:path';import {createHash} from 'node:crypto';
export async function createTransitionEvidence({root=resolve('diagnostics/visual-break-cues'),sourceRoot=resolve('diagnostics'),maxClips=6,maxBytes=64*1024*1024,automatic=true,read=readFile,write=writeFile}={}){
 let history=[],active=null,pending=null,closed=false,error=null,day=null,count=0,bytes=0,lastAt=null,lastClip=null;
 const source=resolve(sourceRoot)+sep;
 const saveManifest=async()=>{if(active){const start=Date.parse(active.frames[0]?.at),last=Date.parse(active.frames.at(-1)?.at),trigger=Date.parse(active.triggerAt);const coverage={beforeMs:Number.isFinite(start)?Math.max(0,trigger-start):0,afterMs:Number.isFinite(last)?Math.max(0,last-trigger):0,frames:active.frames.length};await write(join(active.folder,'clip.json'),JSON.stringify({...active,folder:undefined,coverage},null,2));lastClip={id:active.triggerAt,state:active.state,channel:active.channel??'',coverage,gaps:active.gaps.length};}};
 const copy=async row=>{const path=resolve(row.frame);if(!path.startsWith(source)){active.gaps.push({at:row.at,reason:'source-outside-diagnostics'});return;}let data;try{data=await read(path);}catch(e){active.gaps.push({at:row.at,reason:e.code??e.message});return;}if(bytes+data.length>maxBytes){active.gaps.push({at:row.at,reason:'daily-byte-limit'});return;}const name=active.frames.length+'-'+createHash('sha256').update(data).digest('hex').slice(0,12)+'.jpg';await write(join(active.folder,name),data);bytes+=data.length;active.frames.push({...row,frame:name,sha256:createHash('sha256').update(data).digest('hex')});};
 const work=async(row,prior)=>{
  const nextDay=row.at.slice(0,10);if(nextDay!==day){if(active){active.state='partial';await saveManifest();active=null;}day=nextDay;const dir=join(root,day);await mkdir(dir,{recursive:true});const names=(await readdir(dir,{withFileTypes:true})).filter(d=>d.isDirectory());count=names.length;bytes=0;for(const d of names)for(const f of await readdir(join(dir,d.name)))try{bytes+=(await stat(join(dir,d.name,f))).size;}catch{}}
  if(active&&Date.parse(row.at)-Date.parse(active.frames.at(-1)?.at??active.triggerAt)>3000){active.state='partial';active.gaps.push({at:row.at,reason:'observation-gap'});await saveManifest();active=null;}
  if(!active&&(row.manual||automatic&&row.transition==='break-start')&&count<maxClips&&bytes<maxBytes){const folder=join(root,day,row.at.replaceAll(':','-'));await mkdir(folder,{recursive:true});count++;active={folder,scope:'sports',trigger:row.manual?'manual':'automatic',channel:row.channel??'',detectorVersion:row.detectorVersion,state:'capturing',triggerAt:row.at,requestedBeforeMs:30000,requestedAfterMs:10000,frames:[],gaps:[],purpose:'Review outgoing visual logos against replay/return graphics; not verified ad labels or a mute predictor'};for(const old of prior)await copy(old);}
  if(!active)return;await copy(row);if(Date.parse(row.at)-Date.parse(active.triggerAt)>=10000){active.state='complete';await saveManifest();active=null;}else await saveManifest();
 };
 return {async capture({channel='',now=Date.now()}={}){
  if(typeof channel!=='string'||channel.length>60||/[\x00-\x1f]/.test(channel))throw Error('Enter a channel name up to 60 characters');
  if(closed)throw Error('Capture is unavailable during restart');
  if(pending||active)throw Error('A transition capture is already saving. Please wait.');
  const latest=history.at(-1);if(!latest||now-Date.parse(latest.at)>3000||now<Date.parse(latest.at))throw Error('No recent single-screen Sports frames. Open Sports mode and wait for live TV capture.');
  error=null;const row={...latest,at:new Date(now).toISOString(),capturedAt:latest.capturedAt??latest.at,manual:true,channel:channel.trim()};
  pending=work(row,history.filter(r=>now-Date.parse(r.at)<=30000)).catch(e=>{error=e.message;active=null;throw e;}).finally(()=>{pending=null;});await pending;
  if(!active)throw Error('Manual capture allowance reached for today');
  if(!active.frames.length){active.state='partial';await saveManifest();active=null;throw Error('No screenshots could be saved. Check capture storage.');}
  return lastClip;
 },observe(input){
  if(closed)return;const at=Date.parse(input.at);if(!Number.isFinite(at))return;
  if(input.viewingMode!=='sports'||input.panes||['two-pane','multiview','navigation'].includes(input.choice)||input.policy?.skipped){history=[];return;}
  // Explicit selection excludes audio/transcripts and mutable receiver state.
  if(lastAt!==null&&(at<=lastAt||at-lastAt>3000))history=[];lastAt=at;
  const row={at:input.at,capturedAt:input.capturedAt,frame:input.frame,choice:input.choice,margin:input.margin,live_play_margin:input.live_play_margin,logo:structuredClone(input.logo??{}),transition:input.policy?.transition,policyReason:input.policy?.reason,policyVersion:input.policyVersion,detectorVersion:input.detectorVersion};
  history=history.filter(r=>at-Date.parse(r.at)<=30000&&at>=Date.parse(r.at));const prior=history;history=[...history,row].slice(-100);
  if(pending){if(active&&active.gaps.length<100)active.gaps.push({at:row.at,reason:'writer-busy'});return;}
  if(!active&&(!automatic||row.transition!=='break-start'))return;
  pending=work(row,prior).catch(e=>{error=e.message;active=null;}).finally(()=>{pending=null;});
 },async close({timeoutMs=2000}={}){closed=true;let timer;const flush=(async()=>{await pending;if(active){active.state='partial';await saveManifest();active=null;}})();flush.catch(e=>{error=e.message;});const done=await Promise.race([flush.then(()=>true,()=>true),new Promise(r=>{timer=setTimeout(()=>r(false),timeoutMs);})]);clearTimeout(timer);if(!done)error='Diagnostic writer did not flush before shutdown deadline';history=[];},get status(){const quotaReached=day===new Date().toISOString().slice(0,10)&&(count>=maxClips||bytes>=maxBytes);return{quotaReached,busy:!!pending,error,clips:count,bytes,history:history.length,lastClip,maxClips,maxBytes,ready:!quotaReached&&!closed&&!pending&&!active&&!!history.length&&Date.now()-Date.parse(history.at(-1).at)<3000};}};
}
