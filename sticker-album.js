/* Permanent, additive collection. Pending Week 1 cards are now visible by request. */
let stickerCelebrationQueue=[];
let albumPage=0;
const albumMobile=window.matchMedia('(max-width:700px)');
albumMobile.addEventListener('change',()=>{if(screen==='album'){albumPage=0;renderStickerAlbum()}});
function stickerArchive(){state.stickerCollectionV1 ??= {version:1,earned:{}};state.stickerCollectionV1.earned ??= {};return state.stickerCollectionV1}
function stickerEligible(card){
 const week=STICKER_WEEKS.find(w=>w.id===card.week);
 // This evaluator covers only the original Week 1. Future weeks require their own dated evidence.
 if(!week?.enabled||week.id!=='week-1')return false;
 const done=id=>QUESTIONS[id].every((_,i)=>st(id).results[i]==='ok');
 if(card.condition==='correct-original-world-v1'&&WORLDS.some(w=>w.id===card.world))return done(card.world);
 if(card.condition==='correct-original-five-worlds-v1')return WORLDS.every(w=>done(w.id));
 return false;
}
function reconcileStickers(mode='migration'){
 const created=!state.stickerCollectionV1,archive=stickerArchive();let changed=created;
 for(const card of STICKER_CATALOG){
  if(Object.prototype.hasOwnProperty.call(archive.earned,card.id)||!stickerEligible(card))continue;
  archive.earned[card.id]={...card,weekLabel:STICKER_WEEKS.find(w=>w.id===card.week).label,earnedAt:mode==='gameplay'?new Date().toISOString():null};changed=true;if(mode==='gameplay')stickerCelebrationQueue.push(card.id);
 }
 if(changed)save();if(stickerCelebrationQueue.length)queueMicrotask(celebrateNewStickers);
}
function syncStickerAlbum(){document.body.classList.toggle('in-sticker-album',screen==='album')}
function ownedStickers(){return Object.values(stickerArchive().earned).filter(c=>c&&typeof c.id==='string').map(record=>({...record,...STICKER_CATALOG.find(c=>c.id===record.id)}))}
function stickerImage(card){
 const pending='<span class="sticker-image-pending">Ilustración pendiente de incorporar</span>';
 if(!card.artReady||!card.image)return pending;
 return `<img src="${esc(card.image)}" alt="${esc(card.name||'Cromo conseguido')}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="sticker-image-pending" hidden>Ilustración pendiente de incorporar</span>`;
}
function albumCards(){
 const owned=ownedStickers(),known=STICKER_CATALOG.filter(c=>c.week==='week-1'&&STICKER_WEEKS.some(w=>w.id===c.week&&w.enabled));
 return [...known.map(c=>({...c,...owned.find(o=>o.id===c.id),owned:owned.some(o=>o.id===c.id)})),...owned.filter(o=>!known.some(c=>c.id===o.id)).map(o=>({...o,owned:true}))];
}
function stickerRequirement(card){return card.condition==='correct-original-five-worlds-v1'?'Responde correctamente las 150 preguntas de los cinco mundos.':'Responde correctamente las 30 preguntas de '+(SCENE_SUBJECTS[card.world]||'su mundo')+'. Puedes recuperar errores en el repaso.'}
function albumLeaves(){
 const groups=new Map();for(const c of albumCards()){const key=c.week||'archive';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c)}
 const leaves=[];for(const cards of groups.values())for(let i=0;i<cards.length;i+=2)leaves.push({label:cards[0].weekLabel||STICKER_WEEKS.find(w=>w.id===cards[0].week)?.label||'Recuerdos de tu aventura',cards:cards.slice(i,i+2)});
 return leaves;
}
function renderAlbumCard(c){
 if(c.owned)return `<button class="owned-sticker" data-sticker="${esc(c.id)}" onclick="openStickerDetails(this.dataset.sticker)">${stickerImage(c)}<strong>${esc(c.name||'Recuerdo de tu aventura')}</strong><span class="sticker-state">Conseguido</span></button>`;
 return `<button class="locked-sticker" data-sticker="${esc(c.id)}" onclick="openStickerRequirement(this.dataset.sticker)" aria-label="${esc(c.name)}: pendiente. Cómo conseguirlo"><span class="sticker-card-back" aria-hidden="true">${c.artReady&&c.image?`<img src="${esc(c.image)}" alt="" loading="lazy">`:''}</span><strong>${esc(c.name)}</strong><span class="sticker-state">Pendiente · Ver objetivo</span></button>`;
}
function openStickerRequirement(id){const c=albumCards().find(c=>c.id===id&&!c.owned);if(!c)return;showModal(esc(c.name),`<p>${esc(stickerRequirement(c))}</p><p>Este cromo todavía está pendiente.</p>`,'')}
function celebrateNewStickers(){
 const ids=[...new Set(stickerCelebrationQueue)];stickerCelebrationQueue=[];if(!ids.length||!classroomReady)return;
 const notice=document.createElement('aside');notice.className='sticker-celebration';notice.setAttribute('role','status');
 const title=document.createElement('strong');title.textContent=ids.length===1?'¡Nuevo cromo conseguido!':'¡Nuevos cromos conseguidos!';
 const text=document.createElement('span');text.textContent=ids.map(id=>STICKER_CATALOG.find(c=>c.id===id)?.name||'Recuerdo de tu aventura').join(' · ');
 const open=document.createElement('button');open.textContent='Ver mi álbum';open.onclick=()=>{notice.remove();go('album')};const close=document.createElement('button');close.textContent='Cerrar';close.onclick=()=>notice.remove();notice.append(title,text,open,close);document.body.append(notice);setTimeout(()=>notice.remove(),9000);
}
function resetStickerCelebrations(){stickerCelebrationQueue=[];document.querySelectorAll('.sticker-celebration').forEach(e=>e.remove())}

function turnAlbum(direction){const step=albumMobile.matches?1:2,leaves=albumLeaves();albumPage=Math.max(0,Math.min(Math.max(0,Math.floor((leaves.length-1)/step)*step),albumPage+direction*step));renderStickerAlbum();document.querySelector('.sticker-book')?.classList.add('album-turning')}
function renderStickerAlbum(){
 syncStickerAlbum();reconcileStickers();const leaves=albumLeaves(),step=albumMobile.matches?1:2;
 albumPage=Math.max(0,Math.min(albumPage,Math.max(0,Math.floor((leaves.length-1)/step)*step)));
 const page=leaf=>leaf?`<article class="sticker-leaf"><h2>${esc(leaf.label)}</h2><div class="sticker-pasteboard">${leaf.cards.map(renderAlbumCard).join('')}</div></article>`:`<article class="sticker-leaf sticker-book-inscription"><p>Cada recuerdo guarda una aventura.</p><p>Tus cromos permanecerán aquí al empezar nuevas semanas.</p></article>`;
 const cards=albumCards(),owned=cards.filter(c=>c.owned).length;
 setApp(`<section class="sticker-album" aria-label="Álbum de cromos"><button class="album-home" onclick="go('home')" aria-label="Inicio"><img src="assets/escenario/optimizado/castillo-central.webp" alt=""><span>Inicio</span></button><div class="album-wallet" aria-label="Monedas estrella: ${starCoinStatus().balance}"><span class="scene-coin-symbol" aria-hidden="true"></span><span>Monedas estrella<strong>${starCoinStatus().balance}</strong></span></div><h1>Álbum de recuerdos</h1><p class="album-collection-count" role="status">${owned} cromos conseguidos · ${cards.length-owned} por conseguir</p><div class="sticker-book">${page(leaves[albumPage])}${albumMobile.matches?'':page(leaves[albumPage+1])}</div><nav class="album-page-controls" aria-label="Páginas del álbum"><button onclick="turnAlbum(-1)" ${albumPage===0?'disabled':''}>Página anterior</button><button onclick="turnAlbum(1)" ${albumPage+step>=leaves.length?'disabled':''}>Página siguiente</button></nav></section>`);
}
function openStickerDetails(id){const card=ownedStickers().find(c=>c.id===id);if(!card)return;showModal(esc(card.name||'Recuerdo de tu aventura'),`<div class="sticker-detail">${stickerImage(card)}</div><p>${esc(card.description||'Un recuerdo de tu colección.')}</p><p>${esc(stickerRequirement(card))}</p><p>${esc(card.weekLabel||STICKER_WEEKS.find(w=>w.id===card.week)?.label||'Recuerdo conservado')}</p>`,'')}
