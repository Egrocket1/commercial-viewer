export function bitDistance(a,b){let v=(a^b)>>>0;v=v-((v>>>1)&0x55555555);v=(v&0x33333333)+((v>>>2)&0x33333333);return (((v+(v>>>4))&0x0f0f0f0f)*0x01010101)>>>24;}
export function matchFingerprint(hashes,references){
 const query=hashes.slice(-48);if(query.length<48||new Set(query).size<16)return null;
 let best;
 for(const reference of references){
  const source=reference.hashes;
  for(let offset=0;offset+query.length<=source.length;offset++){
   // Cheap rejection before evaluating the complete sequence.
   let probe=0;for(const n of [0,12,24,36,47])probe+=bitDistance(query[n],source[offset+n]);
   if(probe>45)continue;
   let errors=0;for(let n=0;n<query.length;n++){errors+=bitDistance(query[n],source[offset+n]);if(errors>query.length*6)break;}
   const mean=errors/query.length;
   if(mean<=6&&(!best||mean<best.meanBitErrors))best={id:reference.id,label:reference.label,meanBitErrors:mean,matchedSeconds:query.length*0.016,offsetSeconds:offset*0.016};
  }
 }
 return best??null;
}
