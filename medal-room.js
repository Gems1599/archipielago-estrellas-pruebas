/* Additive permanent collection. Legacy awards and all world results remain
   untouched. Week 1 is the only existing objective set; never infer a calendar. */
const MEDAL_WORLD_ORDER=['math','english','span','val','nature'];
const MEDAL_ART_FILES=new Set(["aventurero-valencia.png", "aventurero-castellano.png", "aventurero-english.png", "aventurero-matematicas.png", "aventurero-medi-natural.png", "mundo-conquistado-english.png", "mundo-conquistado-valencia.png", "mundo-conquistado-medi-natural.png", "mundo-conquistado-castellano.png", "mundo-conquistado-matematicas.png", "estrella-semana.png"]); // Original PNGs verified in assets/medallas/inventario.json.
const MEDAL_SUBJECT_FILES={math:'matematicas',english:'english',span:'castellano',val:'valencia',nature:'medi-natural'};
let medalToastActive=false,medalToastTimer=null;
function resetMedalCelebrations(){
 clearTimeout(medalToastTimer);medalToastTimer=null;medalToastActive=false;
 document.querySelectorAll('.medal-celebration-toast').forEach(notice=>notice.remove());
}
function actualCorrect(id){return rewardWorldProgress(id).correct}
function actualAttempted(id){return rewardWorldProgress(id).answered}
function realWorldComplete(id){return actualAttempted(id)===QUESTIONS[id].length}
function medalArchive(){state.medalCollectionV1 ??= {version:1,earned:{}};state.medalCollectionV1.earned ??= {};return state.medalCollectionV1}
function medalCatalog(){
 const cards=[];
 for(const w of MEDAL_WORLD_ORDER.map(id=>world(id))){const total=QUESTIONS[w.id].length,target=Math.ceil(total*.75);
  cards.push({id:'adventurer:'+w.id,kind:'adventurer',name:'Aventurero del Mundo · '+SCENE_SUBJECTS[w.id],description:`Responde correctamente al menos el 75 %: ${target} de las ${total} preguntas de ${SCENE_SUBJECTS[w.id]}. Cada pregunta cuenta una sola vez.`,current:actualCorrect(w.id),target,eligible:actualCorrect(w.id)>=target,art:'aventurero-'+MEDAL_SUBJECT_FILES[w.id]+'.png',world:w.id,rule:'correct-75-percent-v1'});
 }
 for(const w of MEDAL_WORLD_ORDER.map(id=>world(id))){const target=QUESTIONS[w.id].length;
  cards.push({id:'conquered:'+w.id,kind:'conquered',name:'Mundo Conquistado · '+SCENE_SUBJECTS[w.id],description:`Completa las ${target} preguntas de ${SCENE_SUBJECTS[w.id]}. Se mantiene la regla de recorrido completado: todas realizadas, aunque queden errores para repasar.`,current:actualAttempted(w.id),target,eligible:realWorldComplete(w.id)||state.awardsSeen['medal_'+w.id]===true,legacy:state.awardsSeen['medal_'+w.id]===true,art:'mundo-conquistado-'+MEDAL_SUBJECT_FILES[w.id]+'.png',world:w.id,rule:'all-attempted-v1'});
 }
 cards.push({id:'weekly-star:week-1',kind:'weekly',name:'Estrella de la Semana · Semana 1',description:'Semana 1 de la aventura: completa los cinco recorridos de 30 preguntas. Es el objetivo semanal que ya existía. Una sola Estrella para esta semana, conservada en tu colección.',current:WORLDS.filter(w=>realWorldComplete(w.id)).length,target:5,eligible:WORLDS.every(w=>realWorldComplete(w.id))||state.awardsSeen.week===true,legacy:state.awardsSeen.week===true,weekId:'week-1',weekLabel:'Semana 1',art:'estrella-semana.png',rule:'week-1-five-worlds-v1'});
 // Plus medals are separate historical awards, never a second weekly Star.
 for(const w of WORLDS)cards.push({id:'legacy-plus:'+w.id,kind:'legacy',name:w.character+' Plus · '+SCENE_SUBJECTS[w.id],description:`Tu medalla Plus original: ${QUESTIONS[w.id].length} respuestas correctas en ${SCENE_SUBJECTS[w.id]}. Se conserva sin cambiar sus condiciones.`,current:actualCorrect(w.id),target:QUESTIONS[w.id].length,eligible:actualCorrect(w.id)===QUESTIONS[w.id].length||state.awardsSeen['plus_'+w.id]===true,legacy:true,art:'mundo-conquistado-'+MEDAL_SUBJECT_FILES[w.id]+'.png',world:w.id,rule:'legacy-plus'});
 cards.push({id:'legacy-week-plus',kind:'legacy',name:'Medalla Semanal Plus original',description:'Tu medalla anterior por conseguir todas las estrellas de los cinco mundos. Se conserva como medalla histórica; no concede otra Estrella de la Semana.',current:WORLDS.filter(w=>actualCorrect(w.id)===QUESTIONS[w.id].length).length,target:5,eligible:WORLDS.every(w=>actualCorrect(w.id)===QUESTIONS[w.id].length)||state.awardsSeen.weekplus===true,legacy:true,art:'estrella-semana.png',rule:'legacy-week-plus'});
 return cards;
}
function reconcileMedalCollection(mode='migration'){
 const created=state.medalCollectionV1==null,archive=medalArchive();let changed=created;
 for(const medal of medalCatalog()){
  if(!medal.eligible||Object.prototype.hasOwnProperty.call(archive.earned,medal.id))continue;
  archive.earned[medal.id]={id:medal.id,name:medal.name,description:medal.description,kind:medal.kind,world:medal.world||null,weekId:medal.weekId||null,weekLabel:medal.weekLabel||null,rule:medal.rule,earnedAt:mode==='gameplay'?new Date().toISOString():null,source:mode==='gameplay'?'gameplay':medal.legacy?'legacy':'existing-progress',celebrationPending:mode==='gameplay'};
  changed=true;
 }
 if(changed)save();
 if(mode==='gameplay')queueMicrotask(celebratePendingMedals);
}
function syncMedalRoomPresentation(){document.body.classList.toggle('in-medal-room',screen==='medals')}
function medalDate(value){if(!value||!Number.isFinite(Date.parse(value)))return 'Fecha no registrada en la partida anterior';return new Date(value).toLocaleDateString('es-ES',{year:'numeric',month:'long',day:'numeric'})}
function medalPicture(medal){
 if(medal.art&&MEDAL_ART_FILES.has(medal.art))return `<img class="collection-medal-image" src="assets/medallas/${medal.art}" alt="" width="512" height="640" draggable="false">`;
 return `<span class="medal-art-placeholder" aria-hidden="true"><span>${medal.world?{math:'MAT',english:'EN',span:'CAS',val:'VAL',nature:'NAT'}[medal.world]:medal.kind==='weekly'?'S1':'PLUS'}</span><small>Ilustración pendiente</small></span>`;
}
function medalDisplayCatalog(){
 const known=medalCatalog(),ids=new Set(known.map(m=>m.id));
 // Preserve archival records if a future objective is retired from the catalog.
 for(const record of Object.values(medalArchive().earned))if(record&&typeof record.id==='string'&&!ids.has(record.id))known.push({id:record.id,name:record.name||'Medalla de tu colección',description:record.description||'Medalla conservada de una versión anterior.',kind:record.weekId?'weekly':'legacy',weekId:record.weekId,weekLabel:record.weekLabel,art:'',current:null,target:null,eligible:false});
 return known;
}
function renderMedalRoom(){
 syncMedalRoomPresentation();reconcileMedalCollection('migration');
 const archive=medalArchive(),catalog=medalDisplayCatalog(),coins=starCoinStatus();
 const tile=m=>{const record=archive.earned[m.id],obtained=Boolean(record);return `<button class="collection-medal ${obtained?'medal-obtained':'medal-pending'} ${record&&record.celebrationPending?'medal-new':''}" data-medal="${esc(m.id)}" onclick="openMedalDetails(this.dataset.medal)" aria-label="${esc(m.name)}, ${obtained?'conseguida':'pendiente'}">${medalPicture(m)}<strong>${esc(m.name.replace(' · '+(m.world?SCENE_SUBJECTS[m.world]:m.weekLabel||''),''))}</strong><span>${m.world?SCENE_SUBJECTS[m.world]:esc(m.weekLabel||'Colección anterior')}</span><small>${obtained?'Conseguida':`${m.current}/${m.target} · Pendiente`}</small></button>`};
 const section=(kind,title,note)=>{const entries=catalog.filter(m=>m.kind===kind&&(kind!=='legacy'||archive.earned[m.id]));return entries.length?`<section class="medal-shelf"><h2>${title}</h2><p>${note}</p><div class="medal-gallery">${entries.map(tile).join('')}</div></section>`:''};
 setApp(`<section class="medal-room" aria-label="Sala del Cofre y las Medallas"><button class="medal-room-home" onclick="save();go('home')" aria-label="Inicio"><img src="assets/escenario/optimizado/castillo-central.webp" alt="" width="50" height="50"><span>Inicio</span></button><div class="medal-room-wallet" aria-label="Monedas estrella: ${coins.available?coins.balance:'pendientes de activar'}"><span class="scene-coin-symbol" aria-hidden="true"></span><span>Monedas estrella<strong>${coins.available?coins.balance:'Pendiente'}</strong></span></div><header class="medal-room-heading"><span>El tesoro de tus aventuras</span><h1>Cofre y Medallas</h1><p>${catalog.filter(m=>archive.earned[m.id]).length} medallas conservadas · ${esc(state.avatarName)}</p></header><div class="medal-room-collection">${section('adventurer','Aventurero del Mundo','Al menos el 75 % de aciertos: 23 de 30 preguntas correctas por mundo.')}${section('conquered','Mundo Conquistado','Completa las 30 preguntas de cada recorrido. Tus medallas de exploración anteriores se conservan aquí.')}${section('weekly','Estrella de la Semana','Semana 1: completa los cinco recorridos. Todavía no hay objetivos programados para semanas nuevas.')}${section('legacy','Tus medallas anteriores','Las Plus originales siguen formando parte de tu colección.')}<footer class="medal-room-footer"><p>Tus medallas originales: pulsa una para verla ampliada y consultar su progreso.</p><button onclick="go('garden')">Ver recompensas del jardín</button><button onclick="go('passport')">Pasaporte</button></footer></div></section>`);
 requestAnimationFrame(celebratePendingMedals);
}
function openMedalDetails(id){
 const medal=medalDisplayCatalog().find(m=>m.id===id);if(!medal)return;
 const record=medalArchive().earned[id],progress=medal.current==null?'Progreso histórico no disponible':medal.kind==='adventurer'?`${medal.current} de ${QUESTIONS[medal.world].length} respuestas correctas. Objetivo: ${medal.target} (75 %).`:`${medal.current} de ${medal.target}${medal.kind==='conquered'?' preguntas realizadas':' mundos completados'}`;
 showModal(esc(medal.name),`<div class="medal-detail-art ${record?'medal-obtained':'medal-pending'}">${medalPicture(medal)}</div><p>${esc(medal.description)}</p><p><strong>Estado: ${record?'Conseguida':'Pendiente'}</strong></p><p>${esc(progress)}</p>${record?`<p>${esc(medalDate(record.earnedAt))}</p>${record.source==='legacy'?'<p>Conservada de tus medallas anteriores.</p>':''}`:''}${medal.weekLabel?`<p>${esc(medal.weekLabel)} · una única Estrella para esta semana.</p>`:''}`,'');
}
function celebratePendingMedals(){
 if(!classroomReady||medalToastActive||document.querySelector('.sticker-celebration'))return;
 const records=Object.values(medalArchive().earned).filter(r=>r.celebrationPending);if(!records.length)return;
 const notice=document.createElement('aside');notice.className='medal-celebration-toast';notice.setAttribute('role','status');
 notice.innerHTML=`<strong>${records.length===1?'¡Una nueva medalla!':'¡'+records.length+' nuevas medallas!'}</strong><p>${records.map(r=>esc(r.name)).join('<br>')}</p><button data-medal-toast-open>Ver colección</button><button data-medal-toast-close aria-label="Cerrar celebración">Cerrar</button>`;
 document.body.append(notice);medalToastActive=true;
 for(const record of records)record.celebrationPending=false;save();
 let closed=false;const close=()=>{if(closed)return;closed=true;resetMedalCelebrations();queueMicrotask(celebrateNewStickers);queueMicrotask(celebratePendingMedals)};
 notice.querySelector('[data-medal-toast-open]').onclick=()=>{close();go('medals')};notice.querySelector('[data-medal-toast-close]').onclick=close;
 medalToastTimer=setTimeout(close,8000);
}
