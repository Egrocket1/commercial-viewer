import test from 'node:test';
import assert from 'node:assert/strict';
import {BreakPolicy} from './break-policy.mjs';
import {correctionDecision} from './correction-hold.mjs';
const logo={present:false};
test('program correction yields to a confirmed later commercial before 15 seconds',()=>{
 const p=new BreakPolicy(),h={type:'false-positive',until:16000};
 const step=(d,at,a={})=>correctionDecision(p,d,logo,at,a,h);
 assert.equal(step({choice:'program'},1000).mute,false);
 assert.equal(step({choice:'ad'},2000).mute,false);
 const out=step({choice:'ad'},2500);
 assert.equal(out.mute,true);assert.equal(out.reason,'commercial-image');assert.equal(h.until,0);
 assert.equal(step({choice:'ad'},3000).mute,true);
});
test('single visual suspicion does not cancel correction; verified commercial does',()=>{
 const p=new BreakPolicy(),h={type:'false-positive',until:16000};
 assert.equal(correctionDecision(p,{choice:'ad'},logo,1000,{},h).mute,false);
 assert.equal(correctionDecision(p,{choice:'program'},logo,1500,{},h).mute,false);
 assert.equal(h.until,16000);
 const out=correctionDecision(p,{choice:'ad',known_ad:{verified:true,distance:0,maxDistance:1}},logo,2000,{},h);
 assert.equal(out.mute,true);assert.equal(h.until,0);
});
test('mute correction yields to verified program and preserves ordinary policy outside hold',()=>{
 const p=new BreakPolicy(),h={type:'false-negative',until:4000};p.inBreak=true;p.started=1000;
 const out=correctionDecision(p,{choice:'program'}, {present:true,id:'sec-abc-top-left-watermark',pattern:{verified:true}},2000,{},h);
 assert.equal(out.mute,false);assert.equal(h.until,0);
 const ordinary=new BreakPolicy();ordinary.completed=[...p.completed];
 assert.deepEqual(correctionDecision(p,{choice:'program'},logo,5000,{},h),ordinary.update({choice:'program'},logo,5000,{}));
});
test('stale audio does not terminate program correction',()=>{
 const p=new BreakPolicy(),h={type:'false-positive',until:16000};
 assert.equal(correctionDecision(p,{choice:'program'},logo,1000,{fresh:false,adCue:true},h).mute,false);
 assert.equal(h.until,16000);
});
