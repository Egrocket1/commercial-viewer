// Keep evaluating fresh evidence during a manual correction. A correction is
// temporary protection, not permission to ignore the next commercial break.
export function correctionDecision(policy,decision,logo,at,audio,hold){
 const state=policy.update(decision,logo,at,audio);
 if(at>=hold.until)return state;
 const commercial=['known-ad-audio','verified-visual-commercial','commercial-speech','broadcast-promo','commercial-image','fox-basketball-verified-commercial-cut'].includes(state.reason);
 const program=['verified-visual-program','sec-abc-watermark-return','navigation','multiview-always-unmuted'].includes(state.reason);
 if(hold.type==='false-positive'&&commercial||hold.type==='false-negative'&&program){hold.until=0;return state;}
 const mute=hold.type==='false-negative';
 // Preserve confirmation counters while overriding output; otherwise two-frame
 // commercial confirmation can never finish during a program correction.
 if(!mute){policy.inBreak=false;policy.started=null;}
 else if(!policy.inBreak){policy.inBreak=true;policy.started=at;}
 return {...state,mute,transition:undefined,reason:'incident-correction-hold',holdUntil:hold.until};
}

