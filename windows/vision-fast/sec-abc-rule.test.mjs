import test from 'node:test';
import assert from 'node:assert/strict';
import {BreakPolicy} from './break-policy.mjs';
const id='sec-abc-top-left-watermark';
test('owner-authorized SEC ABC watermark returns immediately despite conflicting evidence',()=>{
 for(const logo of [{present:true,id,pattern:{verified:true}},{present:true,id:'other',matches:[id],verifiedMatches:[id]}]){
  const p=new BreakPolicy();p.inBreak=true;p.started=0;
  const out=p.update({choice:'ad',known_ad:{verified:true,distance:0,maxDistance:0}},logo,500,{fresh:true,adCue:true,promoCue:true,fingerprint:{label:'ad'}});
  assert.equal(out.mute,false);assert.equal(out.transition,'program-return');assert.equal(out.reason,'sec-abc-watermark-return');assert.deepEqual(out.observedBreakDurations,[.5]);
  assert.equal(p.update({choice:'ad'},logo,1000).mute,false);
 }
});
test('absent and other channel logos do not gain the SEC ABC override',()=>{
 for(const logo of [{present:false,id},{present:true,id},{present:true,id,pattern:{verified:false}},{present:true,id:'abc'},{present:true,id:'sec-network'},{present:true,id:id+'-similar'}]){
  const p=new BreakPolicy();p.inBreak=true;p.started=0;
  assert.equal(p.update({choice:'program',margin:0,live_play_margin:0},logo,500).mute,true);
 }
});
