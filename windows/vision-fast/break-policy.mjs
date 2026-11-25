import {defaultPolicyConfig,validatePolicyConfig,matchPolicyRule} from './policy-config.mjs';
export class BreakPolicy {
 constructor(){this.reset();this.completed=[];this.configure(defaultPolicyConfig);}
 configure(config){this.configuration=validatePolicyConfig(config);this.thresholds=this.configuration.thresholds;}
 reset(){this.inBreak=false;this.started=null;this.returnProfile=null;this.programRun=0;this.livePlayRun=0;this.corroboratedRun=0;this.corroboratedProfile=null;this.adStarted=null;this.adRun=0;this.lastAt=null;this.fs1ProgramAt=null;}
 update(decision,logo,at=Date.now(),audio={}){
  const sec='sec-abc-top-left-watermark';
  const secMatch=logo.id===sec||logo.matches?.includes(sec);
  const verifiedSec=logo.id===sec&&logo.pattern?.verified===true||logo.verifiedMatches?.includes(sec);
  // Coarse or previously recorded SEC hits are not broadcast identity. The
  // recognizer must supply full-pattern proof in this decision.
  if(secMatch&&!verifiedSec){const matches=(logo.matches??[]).filter(id=>id!==sec);logo={...logo,matches,present:logo.present===true&&matches.length>0,id:matches[0]??sec};}
  let transition,reason;
  const audioAd=audio.fresh&&audio.adCue;
  const knownAd=audio.fresh&&audio.fingerprint?.label==='ad';
  const knownVisualAd=decision.known_ad?.verified===true&&Number.isInteger(decision.known_ad.distance)&&decision.known_ad.distance<=decision.known_ad.maxDistance&&decision.known_ad.maxDistance<=3;
  const knownVisualProgram=decision.known_program?.verified===true&&Number.isInteger(decision.known_program.distance)&&decision.known_program.distance<=decision.known_program.maxDistance&&decision.known_program.maxDistance<=3&&!knownVisualAd;
  const audioPromo=audio.fresh===true&&audio.promoCue===true;
  if(this.lastAt!==null&&(at-this.lastAt>3000||at<this.lastAt)){this.programRun=0;this.livePlayRun=0;this.corroboratedRun=0;this.corroboratedProfile=null;this.adStarted=null;this.adRun=0;this.fs1ProgramAt=null;}
  this.lastAt=at;
  const confirmedAd=knownAd||knownVisualAd||audioAd||audioPromo;
  const fs1Identity=logo.verifiedMatches?.some(id=>['fs1-cfb-top-right-watermark','fs1-cfb-multiview-watermark'].includes(id));
  if(confirmedAd)this.fs1ProgramAt=null;
  else if(!this.inBreak&&decision.choice==='program'&&fs1Identity)this.fs1ProgramAt=at;
  const fs1Continuity=!this.inBreak&&!confirmedAd&&this.fs1ProgramAt!==null&&at>=this.fs1ProgramAt&&at-this.fs1ProgramAt<=2500&&logo.continuityMatches?.includes('fs1-bottom-right-ticker');
  const entryVeto=matchPolicyRule(this.configuration.entryVetoes,decision,logo);
  const visualAd=decision.choice==='ad'&&decision.usableForAdEntry!==false&&!logo.present&&!entryVeto&&!knownVisualProgram;
  if(visualAd){this.adStarted??=at;this.adRun++;}else{this.adStarted=null;this.adRun=0;}
  const confirmedVisualAd=visualAd&&this.adRun>=2&&at-this.adStarted>=350&&!fs1Continuity;
  if(decision.choice==='multiview'&&decision.multiview?.verified===true){
   const wasBreak=this.inBreak;this.reset();this.lastAt=at;
   transition=wasBreak?'multiview-reset':undefined;reason='multiview-always-unmuted';
  }else if(decision.choice==='navigation'&&!knownAd&&!knownVisualAd){
   const wasBreak=this.inBreak;this.reset();this.lastAt=at;
   transition=wasBreak?'navigation-reset':undefined;reason='navigation';
  }else if(logo.present===true&&verifiedSec){
   // Owner-authorized program watermark: this channel has no side-by-side ads.
   const wasBreak=this.inBreak;if(wasBreak){this.completed.push((at-this.started)/1000);this.completed=this.completed.slice(-100);}
   this.reset();this.lastAt=at;transition=wasBreak?'program-return':undefined;reason='sec-abc-watermark-return';
  }else if(knownAd||knownVisualAd||confirmedVisualAd||audioAd||audioPromo){
   this.programRun=0;this.livePlayRun=0;this.corroboratedRun=0;this.corroboratedProfile=null;
   if(!this.inBreak){this.inBreak=true;this.started=at;transition='break-start';}
   reason=knownAd?'known-ad-audio':knownVisualAd?'verified-visual-commercial':audioAd?'commercial-speech':audioPromo?'broadcast-promo':'commercial-image';
  }else if(this.inBreak){
   // Consecutive observations must establish one broadcast identity. Different
   // logos (or a missing identity) cannot accumulate toward a program return.
   const primeIds=['prime-tnf-broadcast-watermark','prime-tnf-small-upper-right'];
   // These are two renderings of the same broadcast identity. Require dense
   // template proof; a coarse or unverified Prime hit cannot use this path.
   const verifiedPrime=logo.present===true&&(primeIds.includes(logo.id)&&logo.pattern?.verified===true||logo.verifiedMatches?.some(id=>primeIds.includes(id)));
   const profile=verifiedPrime?'prime-tnf':logo.present===true&&typeof logo.id==='string'&&logo.id?logo.id:null;
   if(!profile||profile!==this.returnProfile){this.programRun=0;this.livePlayRun=0;this.corroboratedRun=0;this.corroboratedProfile=null;}
   this.returnProfile=profile;
   const returnVeto=matchPolicyRule(this.configuration.returnVetoes,decision,logo);
   const corroborated=!returnVeto&&decision.choice==='program'&&decision.margin<=-.02&&decision.live_play_margin>=.025&&logo.present===true&&typeof logo.id==='string';
   if(corroborated){this.corroboratedRun=this.corroboratedProfile===logo.id?this.corroboratedRun+1:1;this.corroboratedProfile=logo.id;}
   else{this.corroboratedRun=0;this.corroboratedProfile=null;}
   // Commercials contain real sports footage. Gameplay similarity alone can
   // never end a break; require broadcast recognition or a verified image.
   const livePlay=!returnVeto&&logo.present===true&&decision.choice==='program'&&decision.live_play_margin>=this.thresholds.livePlay;
   this.livePlayRun=livePlay?this.livePlayRun+1:0;
   const clearGameplay=knownVisualProgram||!returnVeto&&logo.present===true&&decision.choice==='program'&&decision.live_play_margin>=this.thresholds.clearGameplay;
   if(clearGameplay||this.livePlayRun>=2){
    this.completed.push((at-this.started)/1000);this.completed=this.completed.slice(-100);
    reason=knownVisualProgram?'verified-visual-program':clearGameplay?'clear-gameplay-return':'confirmed-gameplay-return';this.reset();this.lastAt=at;transition='program-return';
   }
   else{
   // Non-play segments have weaker semantic margins. Only the fully verified
   // Prime identity can corroborate three consecutive weak program decisions.
   // Ad choices, confirmed commercials, missing identity and vetoes still reset.
   const candidate=!returnVeto&&decision.choice==='program'&&decision.margin<(verifiedPrime?0:-.005)&&profile!==null;
   if(returnVeto)reason='repair-return-veto:'+returnVeto;
   else if(!logo.present&&!knownVisualProgram)reason='awaiting-broadcast-verification';
   if(!candidate){this.programRun=0;}
   else{
    this.programRun++;
    if(this.programRun>=3||this.corroboratedRun>=2){
     this.completed.push((at-this.started)/1000);this.completed=this.completed.slice(-100);
     reason=this.corroboratedRun>=2?'corroborated-broadcast-return':'verified-broadcast-return';this.reset();this.lastAt=at;transition='program-return';
    }
   }
   }
  }
  if(!reason&&fs1Continuity&&visualAd)reason='fs1-verified-program-transition';
  return {mute:this.inBreak,transition,reason,programRun:this.programRun,audioUsed:audio.fresh===true,audioCommercialCue:audioAd===true,breakElapsedSeconds:this.started===null?0:(at-this.started)/1000,observedBreakDurations:this.completed};
 }
}
