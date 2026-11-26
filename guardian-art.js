/* Source PNGs remain byte-for-byte intact. Animate rigid image containers and
   separate lighting/particles; eyes and wings await original layered artwork. */
const GUARDIAN_ART = GUARDIAN_ILLUSTRATIONS;
function renderOriginalGuardian(id,mood,size){
 if(id==='nature')return BrotLayers.render(size);
 const art=GUARDIAN_ART[id];if(!art)return '';
 return `<span class="guardian-art guardian-${art.theme} ${mood==='celebrate'?'guardian-celebrates':''}" style="--guardian-size:${Number(size)}px" role="img" aria-label="${art.name}, guardián del archipiélago"><span class="guardian-ground" aria-hidden="true"></span><span class="guardian-aura" aria-hidden="true"></span><span class="guardian-hover"><span class="guardian-pose"><img src="${art.file}" width="${art.width}" height="${art.height}" alt="" decoding="async" draggable="false"></span></span><span class="guardian-particles" aria-hidden="true">${Array.from({length:4},(_,i)=>`<i style="--particle:${i}"></i>`).join('')}</span></span>`;
}
