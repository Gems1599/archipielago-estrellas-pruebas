/* PNG originals remain intact. One Base, independent shape/colour selections,
   and the same composition in the editor, map and all five worlds. */
const GIRL_ART='assets/avatar/ilustraciones/nina-original.png';
const GIRL_LAYER_BASE='assets/avatar/capas/nina-v1/base-sin-pelo.png';
const GIRL_LAYER_HAIR=[
 {id:'short',label:'Corto',file:'assets/avatar/capas/nina-v1/peinados/corto.png'},
 {id:'long',label:'Largo',file:'assets/avatar/capas/nina-v1/peinados/largo.png'},
 {id:'waves',label:'Ondulado',file:'assets/avatar/capas/nina-v1/pruebas/ondulado-frontal.png'},
 {id:'curls',label:'Rizado',file:'assets/avatar/capas/nina-v1/peinados/rizado.png'},
 {id:'ponytail',label:'Coleta',file:'assets/avatar/capas/nina-v1/peinados/coleta.png'},
 {id:'none',label:'Sin pelo',file:null}
];
function usesIllustratedGirl(){return state.illustratedAvatarV1?.enabled===true&&['girl-original-v1','girl-layered-v1'].includes(state.illustratedAvatarV1.template)}
function layeredGirlSelection(saved=state.illustratedAvatarV1||{}){
 const choice=(key,fallback)=>GIRL_PALETTE[key].some(x=>x[0]===saved[key])?saved[key]:fallback;
 return {hair:GIRL_LAYER_HAIR.some(h=>h.id===saved.hair)?saved.hair:'waves',clothes:saved.clothes==='outfit-blue'?'outfit-blue':'base',hairColor:choice('hairColor','brown'),eyes:choice('eyes','brown'),skin:choice('skin','original')};
}
function normalizeIllustratedAvatar(){
 // A narrow migration: only removed styles change, including dormant selections.
 // Keep clothing, colours, enabled state, the classic avatar and unknown fields.
 if(state.illustratedAvatarV1&&['braids','bun'].includes(state.illustratedAvatarV1.hair))state.illustratedAvatarV1.hair='waves';
}
function girlComposition(selection,equipment=shopEquipment(),inlineTint=true){
 const hair=GIRL_LAYER_HAIR.find(h=>h.id===selection.hair)||GIRL_LAYER_HAIR[2];
 const colour=`data-skin="${selection.skin}" data-eyes="${selection.eyes}" data-hair-color="${selection.hairColor}"${inlineTint?' onload="tintGirlLayer(this)"':''}`;
 return `<span class="girl-layer-group">${shopEquipmentArt(equipment,['wings','back'],'behind')}<img data-girl-layer="base" ${colour} src="${GIRL_LAYER_BASE}" alt="" width="1024" height="1536" draggable="false">${selection.clothes==='outfit-blue'&&!equipment.outfit&&!equipment.top&&!equipment.bottom?'<img data-girl-layer="clothes" src="assets/avatar/capas/nina-v1/pruebas/vestido-azul.png" alt="" width="1024" height="1536" draggable="false">':''}${shopEquipmentArt(equipment,['outfit','bottom','top','feet','jacket','back','neck'])}${hair.file?`<img data-girl-layer="hair" data-hair-id="${hair.id}" ${colour} src="${hair.file}" alt="" width="1024" height="1536" draggable="false">`:''}${shopEquipmentArt(equipment,['head','face','hand'])}</span>`;
}
function renderAvatar(scale=1,appearance=state.avatar){
 if(usesIllustratedGirl()&&appearance===state.avatar){const layered=state.illustratedAvatarV1.template==='girl-layered-v1',selection=layeredGirlSelection();
  const eyelid=layered&&selection.skin!=='original'?GIRL_PALETTE.skin.find(entry=>entry[0]===selection.skin)[2]:'#ffba83';
  return `<span class="storybook-avatar illustrated-girl ${layered?'girl-uses-layers':''}" role="img" aria-label="${layered?'Tu personaje ilustrado personalizado':'Niña ilustrada original'}" style="--girl-width:${180*scale}px;--girl-height:${270*scale}px;--everluna-eyelid:${eyelid}">${layered?girlComposition(selection):`<img src="${GIRL_ART}" alt="" width="1024" height="1536" draggable="false">`}<span class="everluna-eyelids" aria-hidden="true"></span></span>`}
 return renderClassicAvatar(scale,appearance);
}
function chooseGirlLayer(key,value){
 if(key==='hair'&&!GIRL_LAYER_HAIR.some(h=>h.id===value))return;
 if(key==='clothes'&&!['base','outfit-blue'].includes(value))return;
 if(GIRL_PALETTE[key]&&!GIRL_PALETTE[key].some(x=>x[0]===value))return;
 if(!['hair','clothes','enable',...Object.keys(GIRL_PALETTE)].includes(key))return;
 const next=layeredGirlSelection();if(key!=='enable')next[key]=value;
 if(key==='clothes'&&state.shopEquipmentV1)for(const slot of ['outfit','top','bottom','jacket'])delete state.shopEquipmentV1[slot];
 state.illustratedAvatarV1={...state.illustratedAvatarV1,...next,enabled:true,template:'girl-layered-v1'};save();renderAvatarScreen();
 document.querySelector(`[data-girl-${key}="${value}"]`)?.focus({preventScroll:true});
}
function girlColourControls(key,label,current){
 return `<fieldset class="character-options"><legend>${label}</legend><div class="choice-row">${GIRL_PALETTE[key].map(([id,name,hex])=>`<button class="swatch girl-colour" style="background:${hex}" data-girl-${key}="${id}" aria-label="${label}: ${name}" title="${name}" aria-pressed="${current[key]===id}" onclick="chooseGirlLayer('${key}','${id}')"></button>`).join('')}</div></fieldset>`;
}
function girlLayerControls(current){
 return `<h2>Peinado y ropa</h2><fieldset class="character-options"><legend>Forma del pelo</legend><div class="girl-hair-gallery">${GIRL_LAYER_HAIR.map(h=>`<button class="girl-hair-preview" data-girl-hair="${h.id}" aria-pressed="${current.hair===h.id}" onclick="chooseGirlLayer('hair','${h.id}')"><span class="girl-option-preview">${girlComposition({...current,hair:h.id})}</span><strong>${h.label}</strong><span>${current.hair===h.id?'Elegido':'Elegir'}</span></button>`).join('')}</div></fieldset><fieldset class="character-options"><legend>Ropa</legend><div class="girl-clothes-gallery">${[['base','Ropa crema original'],['outfit-blue','Vestido azul · prueba']].map(([id,label])=>`<button class="girl-hair-preview" data-girl-clothes="${id}" aria-pressed="${current.clothes===id&&!Object.keys(shopEquipment()).some(slot=>['outfit','top','bottom','jacket'].includes(slot))}" onclick="chooseGirlLayer('clothes','${id}')"><span class="girl-option-preview">${girlComposition({...current,clothes:id},Object.fromEntries(Object.entries(shopEquipment()).filter(([slot])=>!['outfit','top','bottom','jacket'].includes(slot))))}</span><strong>${label}</strong><span>${current.clothes===id&&!Object.keys(shopEquipment()).some(slot=>['outfit','top','bottom','jacket'].includes(slot))?'Elegida':'Elegir'}</span></button>`).join('')}</div></fieldset><p class="wardrobe-help">El vestido azul sigue siendo provisional: aún asoman detalles de la blusa original. Estas prendas de prueba no cuestan monedas.</p>${shopWardrobe()}`;
}
let avatarSetupActive=false;
function adventureIntro(title,message,actions,worldId){
 return `<section class="adventure-intro"><div class="adventure-portrait">${renderAvatar(1.1)}</div><div class="adventure-dialog"><h1 tabindex="-1">${esc(title)}</h1><p class="adventure-message">${esc(message)}</p>${worldId?MagicMissions.guardian(worldId):''}<div class="adventure-actions">${actions}</div></div></section>`;
}
async function finishAvatarSetup(button){
 if(!avatarSetupActive||!classroomReady||button.disabled)return;
 const epoch=classroomEpoch;
 button.disabled=true;
 state.avatarSetupV1='complete';
 save();
 while(classroomBusy||classroomDirty){
  if(epoch!==classroomEpoch)return;
  if(classroomFailed){button.disabled=false;return}
  await classroomFlush();
  if(classroomBusy)await new Promise(resolve=>setTimeout(resolve,30));
 }
 if(epoch!==classroomEpoch||classroomFailed)return;
 avatarSetupActive=false;
 go('avatar-reveal');
}
function renderAvatarReveal(){
 setApp(adventureIntro(state.avatarName+' entra en Everluna','Tu personaje ya está preparado para explorar los cinco mundos.','<button type="button" id="avatar-reveal-map">Entrar al mapa</button>'));
 document.getElementById('avatar-reveal-map').onclick=()=>{go('home');announceMagicMissions()};
}
function renderAvatarScreen(){
 const paneScroll={};document.querySelectorAll('.wardrobe-panel').forEach(p=>{paneScroll[p.classList.contains('wardrobe-closet')?'closet':'traits']=p.scrollTop});
 // Opening the new editor selects the illustrated Base. Retain the previous
 // complete PNG/classic appearance in saved data instead of deleting it.
 if(!usesIllustratedGirl()||state.illustratedAvatarV1.template!=='girl-layered-v1'){
  state.illustratedAvatarV1={...state.illustratedAvatarV1,...layeredGirlSelection(),enabled:true,template:'girl-layered-v1'};save();
 }
 normalizeIllustratedAvatar();syncWardrobePresentation();const coins=starCoinStatus(),current=layeredGirlSelection();
 setApp(`<section class="wardrobe-room girl-dressing-room" data-wardrobe-tab="${wardrobeTab}" aria-label="Vestidor mágico"><button class="wardrobe-home" onclick="go('home')" aria-label="Inicio" ${avatarSetupActive?'hidden':''}><img src="assets/escenario/optimizado/castillo-central.webp" alt=""><span>Inicio</span></button><div class="wardrobe-wallet" aria-label="Monedas estrella: ${coins.balance}"><span class="scene-coin-symbol" aria-hidden="true"></span><span>Monedas estrella<strong>${coins.balance}</strong></span></div><header class="wardrobe-heading"><span>Tu personaje, a tu manera</span><h1>${avatarSetupActive?'Bienvenida a Everluna, '+esc(state.avatarName):'El vestidor mágico'}</h1></header><div class="wardrobe-layout"><section class="wardrobe-preview" aria-label="Tu personaje personalizado"><div class="wardrobe-avatar">${renderAvatar(2.2)}</div><h2 data-character-name>${esc(state.avatarName)}</h2><p>Tu apariencia se ve también en los cinco mundos</p><span class="wardrobe-save-status" data-avatar-colour-status>Los cambios se guardan con tu partida</span><button class="wardrobe-done" onclick="${avatarSetupActive?'finishAvatarSetup(this)':"go('home')"}">${avatarSetupActive?'Guardar mi personaje':'Listo, volver a la aventura'}</button></section><div class="wardrobe-tabs" aria-label="Secciones del vestidor"><button onclick="setWardrobeTab('traits')" aria-pressed="${wardrobeTab==='traits'}">Colores</button><button onclick="setWardrobeTab('closet')" aria-pressed="${wardrobeTab==='closet'}">Peinado y ropa</button></div><section class="wardrobe-panel wardrobe-traits" aria-label="Rasgos del personaje"><h2>Tu personaje</h2><div class="wardrobe-name"><label for="avname">Nombre del personaje</label><input id="avname" maxlength="32" value="${esc(state.avatarName)}" oninput="updateAvatarName(this.value)"></div><fieldset class="character-options"><legend>Personaje</legend><span class="girl-base-label">Base</span></fieldset>${girlColourControls('hairColor','Color del cabello',current)}${girlColourControls('eyes','Color de ojos',current)}${girlColourControls('skin','Tono de piel',current)}</section><section class="wardrobe-panel wardrobe-closet" aria-label="Peinados y ropa">${girlLayerControls(current)}</section></div></section>`);
 document.querySelectorAll('.wardrobe-panel').forEach(p=>{p.scrollTop=paneScroll[p.classList.contains('wardrobe-closet')?'closet':'traits']||0});
}
