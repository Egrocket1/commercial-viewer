// Diagnostic asymmetric policy: ad entry immediate, program return confirmed.
export function createMutePolicy({initialMuted=false,programFrames=2,minProgramSpanMs=250}={}){
 let muted=initialMuted,count=0,since=null;
 return {update(gameplay,now){let reason,confirmation_ms=0;
  if(gameplay===false){muted=true;count=0;since=null;reason='ad_immediate';}
  else if(gameplay===null){muted=false;count=0;since=null;reason='inconclusive_fail_open';}
  else if(!muted){count=0;since=null;reason='program_audible';}
  else{count++;since??=now;confirmation_ms=now-since;if(count>=programFrames&&confirmation_ms>=minProgramSpanMs){muted=false;reason='program_return_confirmed';}else reason='waiting_for_program_confirmation';}
  return {desired_muted:muted,reason,consecutive_program_frames:count,program_confirmation_ms:confirmation_ms};
 }};
}
