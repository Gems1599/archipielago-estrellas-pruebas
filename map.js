/* Independently rendered scenery, guardians, bridges and traveler. Coordinates
   are percentages shared by the SVG bridges and the responsive HTML islands. */
const MAP_PLACES={math:{x:17,y:27},english:{x:83,y:27},val:{x:18,y:70},span:{x:82,y:70},nature:{x:50,y:79}};
const MAP_HUB={x:50,y:51};
const SCENE_SUBJECTS={math:'Matemáticas',english:'English',span:'Castellano',val:'Valencià',nature:'Medi Natural'};
const SCENE_FILES={math:'isla-matematicas',english:'isla-english',span:'isla-castellano',val:'isla-valencia',nature:'isla-medi-natural'};
const SCENE_ASSET='assets/escenario/optimizado/';
let mapJourney=null;
function guardianArt(id,mood='welcome',size=116){return renderOriginalGuardian(id,mood,size)}
function companionArt(id,mood='welcome',size=116){return guardianArt(id,mood,size)}
function sceneImage(name,cls,alt=''){return `<img class="${cls}" src="${SCENE_ASSET+name}.webp" alt="${alt}" draggable="false" decoding="sync">`}
function mapTotalStars(){return WORLDS.reduce((total,w)=>total+mapWorldProgress(w.id).correct,0)}
function mapWorldComplete(id){return mapWorldProgress(id).answered===30}
function mapCompletedWorlds(){return WORLDS.filter(w=>mapWorldComplete(w.id)).length}
function mapReviewCount(id){const progress=mapWorldProgress(id);return progress.answered-progress.correct}
function sceneAccess(kind){
 if(kind==='home'){go('home');return}
 if(kind==='avatar'){go('avatar');return}
 if(kind==='passport'||kind==='achievements'){go('passport');return}
 if(kind==='chests'||kind==='medals'){go('medals');return}
 if(kind==='diary'){showModal('Diario de aventuras',`<p>${mapTotalStars()} estrellas · ${mapCompletedWorlds()} de 5 mundos completados</p><ul class="scene-progress-list">${WORLDS.map(w=>`<li><strong>${SCENE_SUBJECTS[w.id]}</strong><span>${mapWorldProgress(w.id).answered}/30 pruebas · ${mapWorldProgress(w.id).correct}/30 estrellas</span><small>${mapWorldComplete(w.id)?'Recorrido completado':mapReviewCount(w.id)?mapReviewCount(w.id)+' pendientes de repaso':'En curso'}</small></li>`).join('')}</ul><p>Tu avance se guarda en tu cuenta.</p>`,'');return}
 if(kind==='album'){go('album');return}
 if(kind==='shop')go('shop');
}
// Answer stars remain educational progress; spendable coins use the persisted phase ledger.

function renderSceneNavigation(){
 const items=[['diary','Diario','diario-magico'],['album','Álbum de cromos','album-cromos'],['avatar','Avatar','espejo-avatar'],['medals','Medallas','cofre-recompensas'],['shop','Tienda','tienda-magica']];
 const coins=starCoinStatus();
 return `<button class="mission-map-access" onclick="go('missions')">Misiones</button><nav class="scene-nav scene-nav-bottom" aria-label="Objetos mágicos">${items.map(([id,label,file])=>{const png=['album-cromos','espejo-avatar'].includes(file)?'optimizado/'+file:file;return `<button class="scene-nav-action" data-scene-access="${id}" onclick="sceneAccess('${id}')" aria-label="${label}" title="${label}"><picture class="scene-nav-icon" aria-hidden="true"><source type="image/webp" srcset="assets/interfaz/optimizado/${file}.webp"><img class="scene-icon-image" src="assets/interfaz/${png}.png" data-original="assets/interfaz/${file}.png" alt="" width="1312" height="1199" draggable="false" decoding="async"></picture><span class="scene-nav-label">${label}</span></button>`}).join('')}</nav><div class="scene-nav scene-nav-top" aria-label="Monedas estrella, nombre e Inicio"><div class="scene-status-item scene-wallet" data-header-item="coins" title="Una Moneda Estrella por cada fase de cinco preguntas" aria-label="Monedas estrella: ${coins.balance}"><span class="scene-coin-symbol" aria-hidden="true"></span><span><span class="scene-status-label">Monedas estrella</span><span class="scene-coin-value" data-currency-state="${coins.available?'active':'pending'}">${coins.available?coins.balance:'Pendiente'}</span></span></div><div class="scene-status-item scene-player" data-header-item="name"><span class="scene-status-label">Nombre</span><span class="scene-player-name" title="${esc(state.avatarName)}">${esc(state.avatarName)}</span></div><button class="scene-nav-action scene-home-action" data-scene-access="home" data-header-item="home" onclick="sceneAccess('home')" aria-label="Inicio" title="Volver al mapa"><img src="assets/escenario/optimizado/castillo-central.webp" class="scene-home-image" alt="" width="44" height="44"><span>Inicio</span></button></div>`;
}
function renderHome(){
 cancelMapJourney();
 const complete=mapCompletedWorlds()===5;
 const objects=[];
 setApp(`<section class="magical-home scene-home-view" aria-label="Everluna">${renderSceneNavigation()}<div class="scene-scroll" id="scene-scroll" tabindex="0" aria-label="Mapa explorable. Desliza para explorar las cinco islas."><div class="scene-board enchanted-map ${complete?'castle-complete':''}" id="scene-board"><h1 class="scene-heading">Everluna</h1><p class="scene-greeting">${mapTotalStars()}/150 estrellas · ${mapCompletedWorlds()}/5 mundos</p><div class="scene-mist" aria-hidden="true"></div><svg class="luminous-bridges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${WORLDS.map(w=>{const p=MAP_PLACES[w.id];return `<path id="bridge-${w.id}" class="map-bridge ${mapWorldComplete(w.id)?'bridge-lit':''}" d="M50 51 Q50 ${p.y} ${p.x} ${p.y}"/>`}).join('')}</svg><div class="central-castle">${sceneImage('castillo-central','scene-castle','Castillo central mágico')}<div class="castle-lights" role="img" aria-label="${mapCompletedWorlds()} de 5 luces encendidas">${WORLDS.map((w,i)=>`<span class="castle-wing castle-light ${mapWorldComplete(w.id)?'is-lit':''}" data-castle-world="${w.id}" style="--light-x:${[31,41,50,59,69][i]}%;--light-y:${[42,32,24,32,42][i]}%" title="${SCENE_SUBJECTS[w.id]}: ${mapWorldComplete(w.id)?'recorrido completado':'pendiente'}"></span>`).join('')}</div></div><div class="scene-plaza">${sceneImage('plaza-central','scene-plaza-image','Plaza central del castillo')}</div>${WORLDS.map(w=>{const p=MAP_PLACES[w.id];return `<button class="map-island scene-island ${mapWorldComplete(w.id)?'is-complete':''}" data-world="${w.id}" style="left:${p.x}%;top:${p.y}%;--island-color:${w.color}" onclick="travelToIsland('${w.id}')" aria-label="Visitar ${SCENE_SUBJECTS[w.id]}, guardián ${w.character}" aria-pressed="false">${sceneImage(SCENE_FILES[w.id],'scene-island-image')}<span class="island-guardian">${guardianArt(w.id,mapWorldComplete(w.id)?'celebrate':'welcome',105)}</span><span class="island-label"><span class="island-name">${SCENE_SUBJECTS[w.id]}</span><span class="island-progress">${mapWorldProgress(w.id).correct}/30 estrellas · ${w.character}</span></span><span class="scene-portal-anchor" data-portal-world="${w.id}" aria-hidden="true"></span><span class="scene-educational-anchor" data-cloud-world="${w.id}" aria-hidden="true"></span></button>`}).join('')}<div class="scene-objects" aria-label="Accesos de la plaza">${objects.map(([id,label,x,y])=>`<button class="scene-object scene-object-${id}" style="left:${x}%;top:${y}%" onclick="sceneAccess('${id}')" aria-label="${label}"><span>${label}</span></button>`).join('')}<button class="scene-object scene-object-motion" style="left:50%;top:62%" onclick="toggleMotion();this.textContent=state.motion?'Movimiento suave':'Sin movimiento'">${state.motion?'Movimiento suave':'Sin movimiento'}</button></div><div id="map-traveler" class="map-traveler" style="left:50%;top:51%" aria-label="Tu personaje en el camino">${renderAvatar(.62)}</div><div id="map-status" class="map-status" role="status" aria-live="polite">Elige un mundo para comenzar</div><div id="island-arrival" class="island-arrival" tabindex="-1"></div>${complete?'<div class="castle-celebration" role="status">Las cinco luces brillan juntas</div>':''}<p class="scene-explore-hint">Desliza para explorar · Selecciona una isla</p><div class="scene-future-effects" data-layer="bridges-portals-clouds-celebration" aria-hidden="true"></div></div></div></section>`);
 requestAnimationFrame(()=>{const viewport=$('scene-scroll');if(viewport)viewport.scrollLeft=(viewport.scrollWidth-viewport.clientWidth)/2});
}
function closeSceneArrival(id){const panel=$('island-arrival');if(panel){panel.classList.remove('arrival-visible');panel.innerHTML=''}const island=document.querySelector(`[data-world="${id}"]`);if(island)island.focus({preventScroll:true})}
function cancelMapJourney(){if(mapJourney){cancelAnimationFrame(mapJourney.frame);mapJourney=null}}
function travelToIsland(id){
 const w=world(id),p=MAP_PLACES[id],traveler=$('map-traveler');if(!w||!p||!traveler)return;
 cancelMapJourney();
 document.querySelectorAll('.guardian-reacting').forEach(g=>g.classList.remove('guardian-reacting'));
 const guardian=document.querySelector(`[data-world="${id}"] .guardian-art`);
 if(guardian){void guardian.offsetWidth;guardian.classList.add('guardian-reacting')}
 const brot=document.querySelector('[data-world="nature"] .brot-art');
 if(id==='nature'&&brot){brot.classList.remove('brot-reacting');void brot.offsetWidth;brot.classList.add('brot-reacting')}
 document.querySelectorAll('.map-bridge').forEach(b=>b.classList.toggle('bridge-active',b.id==='bridge-'+id));
 document.querySelectorAll('.map-island').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.world===id)));
 $('island-arrival').classList.remove('arrival-visible');$('island-arrival').innerHTML='';$('map-status').textContent=`Viajando hacia ${SCENE_SUBJECTS[id]}…`;
 const start={x:parseFloat(traveler.style.left),y:parseFloat(traveler.style.top)},journey={frame:0};mapJourney=journey;
 const reduced=()=>!state.motion||matchMedia('(prefers-reduced-motion: reduce)').matches;
 const began=performance.now();traveler.classList.add('is-traveling');
 function step(now){
  if(mapJourney!==journey||screen!=='home'||!traveler.isConnected){cancelMapJourney();return}
  const t=reduced()?1:Math.min(1,(now-began)/1300),u=t*t*(3-2*t);
  // Return to the central hub first when changing islands, following both bridges.
  const point=(a,b,c,t)=>({x:(1-t)**2*a.x+2*(1-t)*t*b.x+t*t*c.x,y:(1-t)**2*a.y+2*(1-t)*t*b.y+t*t*c.y});
  const hub=MAP_HUB;let q;
  if(Math.abs(start.x-50)<.1&&Math.abs(start.y-51)<.1)q=point(hub,{x:50,y:p.y},p,u);
  else if(u<.5)q=point(start,{x:50,y:start.y},hub,u*2);
  else q=point(hub,{x:50,y:p.y},p,(u-.5)*2);
  traveler.style.left=q.x+'%';traveler.style.top=q.y+'%';
  if(t<1)journey.frame=requestAnimationFrame(step);else{
   mapJourney=null;traveler.classList.remove('is-traveling');
   $('map-status').textContent=`Has llegado a ${SCENE_SUBJECTS[id]}. ${w.character} te da la bienvenida.`;
   const panel=$('island-arrival');panel.innerHTML=`<button class="scene-arrival-close" aria-label="Cerrar visita" onclick="closeSceneArrival('${id}')">Cerrar</button><div class="arrival-portrait">${guardianArt(id,'welcome',135)}</div><div><span class="label">${w.subject}</span><h2>${w.character} te espera en ${SCENE_SUBJECTS[id]}</h2><p>${mapWorldProgress(id).answered} de 30 pruebas realizadas · ${mapWorldProgress(id).correct} estrellas · ${mapReviewCount(id)} pendientes de repaso</p><p>${mapWorldComplete(id)?'Recorrido completado: su luz ya brilla en el castillo.':'Cada prueba te acerca a encender una nueva luz del castillo.'}</p><button class="primary" onclick="cancelMapJourney();openWorld('${id}')">Entrar en ${SCENE_SUBJECTS[id]}</button></div>`;
   panel.classList.add('arrival-visible');panel.focus({preventScroll:true});
  }
 }
 journey.frame=requestAnimationFrame(step);
}
