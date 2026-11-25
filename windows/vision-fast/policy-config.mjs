// Declarative repair surface: no generated code, commands, paths or time-based overrides.
export const defaultPolicyConfig={schemaVersion:1,thresholds:{livePlay:.05,clearGameplay:.06},returnVetoes:[],entryVetoes:[],knownAdReferences:[],knownProgramReferences:[]};
export const repairFeatures=['ad_similarity','program_similarity','live_play_margin','margin','baseball_similarity','navigation_similarity','promo_similarity','logo_present'];
export function validatePolicyConfig(value){
 const c=value?.schemaVersion===undefined?{...defaultPolicyConfig,thresholds:value}:value;
 if(!c||c.schemaVersion!==1||Object.keys(c).some(k=>!['schemaVersion','thresholds','returnVetoes','entryVetoes','knownAdReferences','knownProgramReferences'].includes(k)))throw Error('Invalid policy configuration');
 c.knownAdReferences??=[];
 c.knownProgramReferences??=[];
 for(const list of [c.knownAdReferences,c.knownProgramReferences]){
 if(!Array.isArray(list)||list.length>2048)throw Error('Invalid known-image library');
 for(const r of list)if(!r||Object.keys(r).some(k=>!['hash','distance','incidentId','frame','sha256'].includes(k))||!/^[a-f0-9]{16}$/.test(r.hash)||!Number.isInteger(r.distance)||r.distance<0||r.distance>3||!Number.isFinite(r.frame?.length)||!/^[a-f0-9]{64}$/.test(r.sha256)||!/^[a-f0-9-]{36}$/.test(r.incidentId))throw Error('Invalid verified image reference');
 }
 const t=c.thresholds;if(!t||Object.keys(t).length!==2||!Number.isFinite(t.livePlay)||!Number.isFinite(t.clearGameplay)||t.livePlay<.02||t.clearGameplay<t.livePlay||t.clearGameplay>.15)throw Error('Invalid gameplay thresholds');
 const ids=new Set();for(const key of ['returnVetoes','entryVetoes']){
  if(!Array.isArray(c[key])||c[key].length>4)throw Error('At most four bounded veto rules are supported');
  for(const rule of c[key]){
   if(!rule||Object.keys(rule).some(k=>!['id','conditions'].includes(k))||!/^[a-z0-9-]{1,64}$/.test(rule.id)||ids.has(rule.id)||!Array.isArray(rule.conditions)||rule.conditions.length<2||rule.conditions.length>4)throw Error('Invalid bounded policy rule');ids.add(rule.id);
   for(const condition of rule.conditions)if(!condition||Object.keys(condition).some(k=>!['feature','min','max'].includes(k))||!repairFeatures.includes(condition.feature)||![condition.min,condition.max].every(Number.isFinite)||condition.min< -1||condition.max>1||condition.min>condition.max)throw Error('Invalid numeric rule condition');
  }
 }
 return structuredClone(c);
}
export function matchPolicyRule(rules,decision,logo={}){
 return rules?.find(rule=>rule.conditions.every(c=>{const value=c.feature==='logo_present'?(logo.present?1:0):decision[c.feature];return Number.isFinite(value)&&value>=c.min&&value<=c.max;}))?.id??null;
}
