import test from 'node:test';
import assert from 'node:assert/strict';
import {BreakPolicy} from './break-policy.mjs';
function enter(){const p=new BreakPolicy();p.update({choice:'ad'},{},0);p.update({choice:'ad'},{},500);assert(p.inBreak);return p;}
test('sports footage cannot end an established commercial break at any gameplay score',()=>{
 for(const score of [.05,.06,.15,1]){const p=enter();for(let n=0;n<12;n++){const result=p.update({choice:'program',margin:-.9,live_play_margin:score},{present:false},1000+n*500);assert(result.mute);assert.equal(result.reason,'awaiting-broadcast-verification');}}
});
test('unverified SEC hits cannot bypass commercial evidence or count toward generic return',()=>{
 const p=enter(),logo={present:true,id:'sec-abc-top-left-watermark',matches:['sec-abc-top-left-watermark']};
 for(let n=0;n<12;n++)assert(p.update({choice:'program',margin:-.9,live_play_margin:1},logo,1000+n*500).mute);
});
test('genuine broadcast evidence and verified exact program frames still release mute',()=>{
 const p=enter();assert.equal(p.update({choice:'program',live_play_margin:.08},{present:true,id:'broadcast-profile'},1000).mute,false);
 const q=enter();assert.equal(q.update({choice:'program',known_program:{verified:true,distance:0,maxDistance:0}},{present:false},1000).mute,false);
});
