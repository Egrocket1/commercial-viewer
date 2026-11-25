// Experimental, causal and shadow-only. This forecasts break risk; it never
// requests mute, changes BreakPolicy, or treats elapsed time as a break cue.
export class BreakPredictor {
 constructor(){this.reset();}
 reset(){this.history=[];this.lastAt=null;this.lastVerifiedAt=null;this.lastPredictionAt=null;this.missingRun=0;this.armedUntil=null;this.armedKind=null;}
 update(row){
  const at=Date.parse(row.at),mode=row.viewingMode;
  if(!Number.isFinite(at)||mode!=='sports'||row.panes||['two-pane','multiview','navigation'].includes(row.choice)){this.reset();return {risk:false,reason:'unsupported-or-navigation'};}
  if(this.lastAt!==null&&(at<=this.lastAt||at-this.lastAt>3000))this.reset();
  this.lastAt=at;
  if(row.policyBefore?.inBreak===true||row.policy?.mute===true){this.history=[];this.lastVerifiedAt=null;this.missingRun=0;this.armedUntil=null;this.armedKind=null;return {risk:false,reason:'already-in-break'};}
  const verified=row.logo?.present===true&&row.choice==='program';
  if(verified){this.lastVerifiedAt=at;this.missingRun=0;if(this.armedKind!=='audio')this.armedUntil=null;}else this.missingRun++;
  this.history=this.history.filter(r=>at-r.at<=8000);
  const program=this.history.filter(r=>r.verified&&Number.isFinite(r.margin)),margins=program.map(r=>r.margin).sort((a,b)=>a-b),baseline=margins[Math.floor(margins.length/2)];
  const quality=row.quality??row.frameQuality;
  // Require a trend away from an established verified broadcast while the
  // current classifier still says program. No ad result is relabelled a forecast.
  const eligible=row.choice==='program'&&row.logo?.present===false&&this.missingRun>=2&&
   this.lastVerifiedAt!==null&&at-this.lastVerifiedAt<=2500&&program.length>=4&&
   quality?.usableForAdEntry===true&&Number.isFinite(row.margin)&&row.margin>=-.01&&row.margin<0&&
   Number.isFinite(row.live_play_margin)&&row.live_play_margin<0&&row.margin-baseline>=.02;
  const newPrediction=eligible&&(this.lastPredictionAt===null||at-this.lastPredictionAt>=15000);
  if(newPrediction){this.lastPredictionAt=at;this.armedUntil=at+3000;this.armedKind='visual';}
  this.history.push({at,verified,margin:row.margin});if(this.history.length>30)this.history.shift();
  return {risk:this.armedUntil!==null&&at<=this.armedUntil,predicted:newPrediction,reason:newPrediction?'verified-broadcast-to-uncertain-nonplay-trend':verified?'broadcast-restored':'no-new-prediction',...(newPrediction?{at:row.at,expiresAt:new Date(this.armedUntil).toISOString(),evidence:{verifiedHistory:program.length,missingRun:this.missingRun,baselineMargin:baseline,margin:row.margin,livePlayMargin:row.live_play_margin}}:{})};
 }
}
