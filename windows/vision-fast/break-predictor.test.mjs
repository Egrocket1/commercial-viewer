import test from 'node:test';import assert from 'node:assert/strict';import {BreakPredictor} from './break-predictor.mjs';
const row=(at,patch={})=>({at:new Date(at).toISOString(),viewingMode:'sports',choice:'program',margin:-.04,live_play_margin:.02,logo:{present:true},quality:{usableForAdEntry:true},policy:{mute:false},policyBefore:{inBreak:false},...patch});
function established(){const p=new BreakPredictor();for(let i=1;i<=6;i++)p.update(row(i*500));return p;}
const lost={logo:{present:false},margin:-.005,live_play_margin:-.02};
test('forecasts from prior observations before any ad decision; never emits mute control',()=>{const p=established();assert(!p.update(row(3500,lost)).predicted);const out=p.update(row(4000,lost));assert(out.predicted&&out.risk);assert(!('mute'in out));assert.equal(out.evidence.verifiedHistory,6);});
test('a current ad is detection, not a pre-commercial prediction',()=>{const p=established();p.update(row(3500,lost));assert(!p.update(row(4000,{...lost,choice:'ad',margin:.02})).predicted);});
test('DWTS, multiview, missing quality, outages and unestablished channels cannot predict',()=>{for(const patch of [{viewingMode:'dwts'},{panes:{}},{choice:'navigation'},{quality:undefined},{quality:{usableForAdEntry:false}}]){const p=established();p.update(row(3500,{...lost,...patch}));assert(!p.update(row(4000,{...lost,...patch})).predicted);}const q=established();q.update(row(8000,lost));assert(!q.update(row(8500,lost)).predicted);const u=new BreakPredictor();u.update(row(3500,lost));assert(!u.update(row(4000,lost)).predicted);});
test('verified program cancels risk; prediction rate and storage stay bounded',()=>{const p=established();p.update(row(3500,lost));assert(p.update(row(4000,lost)).risk);assert(!p.update(row(4500)).risk);for(let i=10;i<1000;i++)p.update(row(i*500));assert(p.history.length<=30);});

test('audio is ignored for prediction, including fresh break language',()=>{const p=established();assert(!p.update(row(3500,{audio:{fresh:true,text:"we will be right back"}})).predicted);});

