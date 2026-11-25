import test from 'node:test';
import assert from 'node:assert/strict';
import {BreakPolicy} from './break-policy.mjs';
const game={choice:'program',margin:-.035,live_play_margin:.035},logo={present:true,id:'verified-channel'};
test('ordinary return requires three consecutive observations of the same profile',()=>{
 const p=enter(),weak={...game,live_play_margin:.01};
 for(let n=0;n<8;n++)assert(p.update(weak,{present:true,id:n%2?'a':'b'},1000+n*500).mute);
 assert(p.update(weak,{present:true,id:'a'},5000).mute);
 assert.equal(p.update(weak,{present:true,id:'a'},5500).mute,false);
});
test('missing identity, interruption and reset discard accumulated return evidence',()=>{
 const weak={...game,live_play_margin:.01};
 for(const interruption of [{present:false},{present:true},{present:true,id:'other'}]){
  const p=enter();p.update(weak,logo,1000);p.update(weak,logo,1500);assert(p.update(weak,interruption,2000).mute);
  assert(p.update(weak,logo,2500).mute);assert(p.update(weak,logo,3000).mute);assert.equal(p.update(weak,logo,3500).mute,false);
 }
 const p=enter();p.update(weak,logo,1000);p.reset();assert.equal(p.returnProfile,null);
});
test('two-frame gameplay return cannot combine different profiles',()=>{
 const p=enter(),strong={choice:'program',margin:0,live_play_margin:.055};
 assert(p.update(strong,logo,1000).mute);assert(p.update(strong,{present:true,id:'other'},1500).mute);
 assert.equal(p.update(strong,{present:true,id:'other'},2000).mute,false);
});
function enter(){const p=new BreakPolicy();p.update({choice:'ad'},{},0);p.update({choice:'ad'},{},500);assert(p.inBreak);return p;}
test('two matching broadcast/gameplay observations return one frame sooner',()=>{
 const p=enter();assert(p.update(game,logo,1000).mute);
 const result=p.update(game,logo,1500);assert.equal(result.mute,false);assert.equal(result.reason,'corroborated-broadcast-return');
});
test('weak gameplay, changed profiles, missing observations and repair vetoes cannot use fast return',()=>{
 for(const weaker of [{...game,live_play_margin:.01},{...game,margin:-.01}]){const p=enter();assert(p.update(weaker,logo,1000).mute);assert(p.update(weaker,logo,1500).mute);assert(!p.update(weaker,logo,2000).mute);}
 const changed=enter();assert(changed.update(game,logo,1000).mute);assert(changed.update(game,{present:true,id:'another-channel'},1500).mute);
 const gap=enter();assert(gap.update(game,logo,1000).mute);assert(gap.update(game,logo,4500).mute);
 const veto=enter();veto.configure({...veto.configuration,returnVetoes:[{id:'block',conditions:[{feature:'live_play_margin',min:0,max:.04},{feature:'logo_present',min:1,max:1}]}]});
 for(let n=0;n<4;n++)assert(veto.update(game,logo,1000+n*500).mute);
});
test('commercial evidence clears fast-return confirmation',()=>{
 for(const audio of [{fresh:true,adCue:true},{fresh:true,promoCue:true},{fresh:true,fingerprint:{label:'ad'}}]){
  const p=enter();assert(p.update(game,logo,1000).mute);assert(p.update(game,logo,1500,audio).mute);assert(p.update(game,logo,2000).mute);assert(!p.update(game,logo,2500).mute);
 }
 const p=enter();p.update(game,logo,1000);assert(p.update({...game,known_ad:{verified:true,distance:0,maxDistance:0}},logo,1500).mute);assert(p.update(game,logo,2000).mute);
});
