/* Atomic, opt-in asset rig. The intact original remains visible until every
   aligned layer is decoded. No automatic cutting, inpainting or deformation. */
const BrotLayers = (()=>{
 const folder='assets/guardianes/brot-capas/';
 const ids=['body','ear-left','ear-right','leaves-head','leaves-tail','eyes-open','eyes-closed'];
 let status='idle',rig=null,pending=null;
 function validate(data){
  if(data.version!==1||data.width!==1312||data.height!==1199||!Array.isArray(data.layers)||data.layers.length!==ids.length)throw Error('Formato de capas no válido');
  const seen=new Set();
  for(const l of data.layers){
   if(!ids.includes(l.id)||seen.has(l.id)||!/^[-a-z0-9]+\.(png|webp)$/.test(l.file)||!Array.isArray(l.pivot)||l.pivot.length!==2||!l.pivot.every(n=>Number.isFinite(n)&&n>=0&&n<=1)||!Number.isInteger(l.z)||l.z<0||l.z>20)throw Error('Capa o articulación no válida');
   seen.add(l.id);
  }
  return data;
 }
 function markup(){
  return `<span class="brot-rig" aria-hidden="true">${rig.layers.map(l=>`<img class="brot-layer brot-layer-${l.id}" data-brot-layer="${l.id}" src="${folder+l.file}" alt="" width="1312" height="1199" style="transform-origin:${l.pivot[0]*100}% ${l.pivot[1]*100}%;z-index:${l.z}" draggable="false">`).join('')}</span>`;
 }
 function hydrate(){
  if(status!=='ready')return;
  document.querySelectorAll('.brot-art:not([data-brot-rig="ready"])').forEach(el=>{
   el.querySelector('.brot-motion').innerHTML=markup();
   el.dataset.brotRig='ready';
  });
 }
 function prepare(){
  if(pending)return pending;
  status='loading';
  pending=(async()=>{
   try{
    const response=await fetch(folder+'rig.json');if(!response.ok)throw Error('Manifiesto no disponible');
    const data=await response.json();
    if(data.enabled!==true){status='awaiting-artwork';return}
    validate(data);
    await Promise.all(data.layers.map(async layer=>{
     const image=new Image();image.src=folder+layer.file;await image.decode();
     if(image.naturalWidth!==data.width||image.naturalHeight!==data.height)throw Error('Las capas deben compartir el lienzo original');
    }));
    rig=data;status='ready';hydrate();
   }catch(error){status='unavailable'} // Keep the complete, undamaged original.
  })();
  return pending;
 }
 function render(size){
  queueMicrotask(()=>prepare().then(hydrate));
  return `<span class="brot-art brot-greeting" role="img" aria-label="Brot, guardián del Jardín Brotaluz" data-brot-rig="${status==='ready'?'ready':'fallback'}" style="--brot-size:${Number(size)}px"><span class="brot-breathe"><span class="brot-motion">${status==='ready'?markup():'<img src="assets/guardianes/brot.png" width="1312" height="1199" alt="" decoding="async" draggable="false">'}</span></span></span>`;
 }
 return {render,prepare,validate,get status(){return status}};
})();
