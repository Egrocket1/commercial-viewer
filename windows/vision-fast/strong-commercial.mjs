// A model margin is evidence, not a calibrated probability. Keep ambiguous
// pictures on normal confirmation and require all independent safeguards.
export function strongCommercialFrame(d,logo,{entryVeto=false,knownVisualProgram=false,continuity=false}={}){
 return d.viewingMode==='sports'&&d.choice==='ad'&&d.scoring_path==='model'&&
  Number.isFinite(d.margin)&&d.margin>=.08&&Number.isFinite(d.live_play_margin)&&d.live_play_margin<=-.08&&
  d.usableForAdEntry===true&&logo.present===false&&!entryVeto&&!knownVisualProgram&&!continuity;
}

