/* All layers use a 240 × 340 canvas. Replace each layer with aligned transparent
   illustrations later; catalog IDs and saved characters remain unchanged. */
const CHARACTER_CATALOG = {
 families: [{id:'human',label:'Humano aventurero',available:true},{id:'fairy',label:'Hadas',available:false},{id:'elf',label:'Elfos',available:false},{id:'magical',label:'Otras criaturas',available:false}],
 skin: ['#f9dcc7','#f2c4a2','#dfaa80','#bf815f','#935e46','#603e33'],
 eyes: ['#547ca0','#659078','#8c654a','#483f61','#b39252'],
 hairColor: ['#49382f','#80533b','#bd8551','#edd29a','#252b3e','#b698ce','#e2a9be'],
 face: [{id:'round',label:'Mejillas redondas'},{id:'soft',label:'Rostro suave'},{id:'freckles',label:'Pecas'}],
 hairStyle: [{id:'bob',label:'Melena corta'},{id:'waves',label:'Ondas'},{id:'curls',label:'Rizos'},{id:'short',label:'Corto'},{id:'braids',label:'Trenzas'}],
 accessories: [{id:'star',label:'Broche estelar'},{id:'flower',label:'Flor del bosque'},{id:'book',label:'Libro de aventuras'},{id:'none',label:'Sin accesorio'}],
 outfits: [
  {id:'outfit-blue',label:'Aventurero azul',color:'#789fd1',dark:'#536fa5',light:'#dae8f5',requiredStars:0},
  {id:'outfit-green',label:'Explorador verde',color:'#91b69a',dark:'#527e68',light:'#e0edcf',requiredStars:6},
  {id:'outfit-violet',label:'Mago violeta',color:'#b49bcf',dark:'#79629e',light:'#eee0f6',requiredStars:15}
 ]
};
function normalizeCharacter(old={}) {
 const a=old&&typeof old==='object'?old:{};
 const color=(key,fallback)=>CHARACTER_CATALOG[key].includes(a[key])?a[key]:fallback;
 const option=(key,list,fallback)=>list.some(x=>x.id===a[key])?a[key]:fallback;
 return {family:'human',skin:color('skin',CHARACTER_CATALOG.skin.includes(a.skin)?a.skin:'#f2c4a2'),face:option('face',CHARACTER_CATALOG.face,'round'),eyes:color('eyes','#547ca0'),hairStyle:option('hairStyle',CHARACTER_CATALOG.hairStyle,'waves'),hairColor:color('hairColor',CHARACTER_CATALOG.hairColor.includes(a.hair)?a.hair:'#80533b'),outfit:option('outfit',CHARACTER_CATALOG.outfits,'outfit-blue'),accessory:option('accessory',CHARACTER_CATALOG.accessories,'star')};
}
function outfitOwned(id){return id==='outfit-blue'||state.customizationInventory.owned.includes(id)}
function reconcileCharacterRewards(){
 for(const o of CHARACTER_CATALOG.outfits){
  if(totalStars()>=o.requiredStars&&!outfitOwned(o.id)){
   state.customizationInventory.owned.push(o.id);
   state.customizationInventory.claimed.push(o.id);
  }
 }
 if(!outfitOwned(state.avatar.outfit))state.avatar.outfit='outfit-blue';
}
function starShape(x,y,r=8){return `<path d="M${x} ${y-r}l${r*.3} ${r*.65} ${r*.7} ${r*.1}-${r*.5} ${r*.5} .12 ${r*.75}-${r*.62}-${r*.35}-${r*.62} ${r*.35} .12-${r*.75}-${r*.5}-${r*.5} ${r*.7}-${r*.1}Z" fill="#f9df9b" stroke="#ba995e" stroke-width=".7"/>`}
let characterRenderId=0;
function renderClassicAvatar(scale=1,appearance=state.avatar){
 const textureId='character-paper-'+(++characterRenderId);
 const a=normalizeCharacter(appearance),o=CHARACTER_CATALOG.outfits.find(o=>o.id===a.outfit);
 const hairBack={bob:'M65 99Q52 26 120 29Q187 25 179 135L155 152H71Z',waves:'M66 94Q49 22 120 28Q187 20 177 111Q200 154 172 194L151 179H76Q43 164 65 126Z',curls:'M64 77Q45 54 68 44Q66 20 92 28Q112 9 133 26Q158 18 166 39Q196 40 181 67Q201 93 180 111L178 172H62Z',short:'M66 98Q52 29 111 28Q166 18 180 61L171 100Z',braids:'M68 98Q52 26 119 28Q185 22 176 106L186 200L159 207L151 119H88L82 207L55 200Z'}[a.hairStyle];
 const face=a.face==='soft'?'M72 84Q73 48 120 48Q167 48 168 84V110Q165 150 120 155Q75 149 72 110Z':'M70 91Q69 47 120 48Q171 47 170 91V112Q168 153 120 155Q72 152 70 112Z';
 return `<svg class="storybook-avatar" width="${180*scale}" height="${255*scale}" viewBox="0 0 240 340" role="img" aria-label="Personaje humano con ${o.label.toLowerCase()}">
 <defs><filter id="${textureId}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="3" seed="7" result="grain"/><feColorMatrix in="grain" type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".12"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>
 <g filter="url(#${textureId})" stroke="#65556b" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">
 <g data-layer="shadow" stroke="none"><ellipse cx="120" cy="321" rx="66" ry="10" fill="#768b8b" opacity=".16"/></g>
 <g data-layer="hair-back" fill="${a.hairColor}"><path d="${hairBack}"/></g>
 <g data-layer="cape" fill="${o.color}"><path d="M86 150Q58 155 47 206L31 280Q70 306 120 288Q174 310 209 279L190 205Q180 156 153 150Z"/><path d="M60 206L48 273M181 202L192 272" opacity=".3"/>${starShape(59,244)}${starShape(180,260,11)}${starShape(172,198,6)}${starShape(76,281,5)}</g>
 <g data-layer="body" fill="${a.skin}"><path d="M105 139V168H135V139"/><path d="M82 178L61 226Q57 244 69 246Q80 245 82 233L99 192M158 177L180 226Q185 243 173 246Q162 245 159 232L142 191"/><path d="M91 255L93 306H112L119 255M125 255L129 306H149L150 255"/></g>
 <g data-layer="clothes"><path d="M89 157L105 151Q120 163 135 151L152 158L166 196L149 204L156 266Q121 278 84 266L91 202L75 195Z" fill="${o.light}"/><path d="M105 154L120 175L135 154M120 175V244" fill="none" stroke="${o.dark}"/><path d="M87 233Q120 241 153 233L154 247Q122 254 86 247Z" fill="${o.dark}"/><rect x="113" y="237" width="15" height="12" rx="3" fill="#f4d58f"/><path d="M91 294L113 296L114 319Q104 327 82 321L82 313Z M128 296L150 294L159 313V321Q137 327 127 319Z" fill="${o.dark}"/>${o.id==='outfit-violet'?starShape(120,207,13):o.id==='outfit-green'?'<path d="M110 205Q114 182 132 187Q132 209 110 205ZM111 204L126 192" fill="#84a780"/>':starShape(120,202,10)}</g>
 <g data-layer="face" fill="${a.skin}"><ellipse cx="70" cy="106" rx="9" ry="13"/><ellipse cx="170" cy="106" rx="9" ry="13"/><path d="${face}"/></g>
 <g data-layer="eyes"><path d="M86 84Q95 78 104 83M136 83Q145 78 154 84" fill="none" stroke="${a.hairColor}" stroke-width="3"/><ellipse cx="96" cy="104" rx="12" ry="16" fill="#fffaf5"/><ellipse cx="144" cy="104" rx="12" ry="16" fill="#fffaf5"/><ellipse cx="98" cy="106" rx="8" ry="12" fill="${a.eyes}"/><ellipse cx="142" cy="106" rx="8" ry="12" fill="${a.eyes}"/><ellipse cx="99" cy="108" rx="4" ry="7" fill="#33354c" stroke="none"/><ellipse cx="141" cy="108" rx="4" ry="7" fill="#33354c" stroke="none"/><circle cx="95" cy="100" r="3.5" fill="white" stroke="none"/><circle cx="138" cy="100" r="3.5" fill="white" stroke="none"/></g>
 <g data-layer="expression"><ellipse cx="84" cy="125" rx="10" ry="5" fill="#e89b9f" opacity=".5" stroke="none"/><ellipse cx="156" cy="125" rx="10" ry="5" fill="#e89b9f" opacity=".5" stroke="none"/><path d="M117 118q-4 7 4 7M110 136q10 9 20 0" fill="none" stroke="#a06f6c"/>${a.face==='freckles'?'<path d="M80 120h1m7 2h1m-3-7h1m64 5h1m7 2h1m-3-7h1" stroke="#a37655" stroke-width="3"/>':''}</g>
 <g data-layer="hair-front" fill="${a.hairColor}"><path d="M69 90Q59 39 110 33Q162 23 175 73L167 93Q151 72 127 63Q109 87 74 84Z"/><path d="M83 63Q108 45 135 48M145 50L160 62" fill="none" stroke="#fff5dd" opacity=".28" stroke-width="4"/>${a.hairStyle==='braids'?'<path d="M66 128l12 15-13 15 12 15-12 15M174 128l-12 15 13 15-12 15 12 15" fill="none" stroke="#fff5dd" opacity=".35"/>':''}</g>
 <g data-layer="accessory">${a.accessory==='star'?starShape(150,166,11):a.accessory==='flower'?'<g fill="#e7bed6"><circle cx="158" cy="67" r="8"/><circle cx="169" cy="74" r="8"/><circle cx="164" cy="86" r="8"/><circle cx="151" cy="83" r="8"/><circle cx="150" cy="72" r="8"/><circle cx="159" cy="76" r="6" fill="#f5db9b"/></g>':a.accessory==='book'?'<path d="M159 220l25-5 6 35-25 5Z" fill="#bc9aba"/><path d="M165 219l6 34" stroke="#f9e9cc"/>':''}</g>
 <g data-layer="watercolor-highlights" fill="white" stroke="none" opacity=".1"><ellipse cx="89" cy="65" rx="25" ry="13"/><path d="M50 263L77 178L68 275ZM169 208L190 271L178 278Z"/></g></g></svg>`;
}
function chooseCharacter(key,value){
 const a=normalizeCharacter({...state.avatar,[key]:value});
 if(key==='outfit'&&!outfitOwned(a.outfit))return;
 state.avatar=a;save();renderAvatarScreen();
 const selected=document.querySelector(`[data-option="${key}:${value}"]`);if(selected)selected.focus({preventScroll:true});
}
function updateAvatarName(v){state.avatarName=v.trim()||'Explorador';save();document.querySelectorAll('[data-character-name]').forEach(e=>e.textContent=state.avatarName)}
let wardrobeTab='traits';
const WARDROBE_ACCESSORY_ART=new Set(); // Activate only original accessory PNGs supplied by the owner.
const WARDROBE_ACCESSORY_FILES={star:'broche-estelar.png',flower:'flor-del-bosque.png',book:'libro-aventuras.png'};
function syncWardrobePresentation(){document.body.classList.toggle('in-wardrobe',screen==='avatar')}
function setWardrobeTab(tab){if(!['traits','closet'].includes(tab))return;wardrobeTab=tab;renderAvatarScreen()}
function renderClassicAvatarScreen(){
 const scroll={traits:document.querySelector('.wardrobe-traits')?.scrollTop||0,closet:document.querySelector('.wardrobe-closet')?.scrollTop||0};
 syncWardrobePresentation();reconcileCharacterRewards();const saved=save(),coins=starCoinStatus();
 const a=state.avatar;
 const colors=(key,label)=>`<fieldset class="character-options"><legend>${label} <small>Gratis</small></legend><div class="choice-row">${CHARACTER_CATALOG[key].map((c,i)=>`<button class="swatch" style="background:${c}" aria-label="${label}: tono ${i+1}" aria-pressed="${a[key]===c}" data-option="${key}:${c}" onclick="chooseCharacter('${key}','${c}')"></button>`).join('')}</div></fieldset>`;
 const choices=(key,label,list)=>`<fieldset class="character-options"><legend>${label} <small>Gratis</small></legend><div class="choice-row">${list.map(o=>`<button class="choice" aria-pressed="${a[key]===o.id}" data-option="${key}:${o.id}" onclick="chooseCharacter('${key}','${o.id}')">${o.label}</button>`).join('')}</div></fieldset>`;
 const accessoryArt=o=>{const file=WARDROBE_ACCESSORY_FILES[o.id];return file&&WARDROBE_ACCESSORY_ART.has(file)?`<img src="assets/avatar/accesorios/${file}" alt="" width="64" height="64">`:''};
 setApp(`<section class="wardrobe-room" data-wardrobe-tab="${wardrobeTab}" aria-label="Vestidor mágico"><button class="wardrobe-home" onclick="save();go('home')" aria-label="Inicio"><img src="assets/escenario/optimizado/castillo-central.webp" alt="" width="48" height="48"><span>Inicio</span></button><div class="wardrobe-wallet" aria-label="Monedas estrella: ${coins.available?coins.balance:'pendientes de activar'}"><span class="scene-coin-symbol" aria-hidden="true"></span><span>Monedas estrella<strong>${coins.available?coins.balance:'Pendiente'}</strong></span></div><header class="wardrobe-heading"><span>Tu rincón encantado</span><h1>El vestidor mágico</h1></header><div class="wardrobe-layout"><section class="wardrobe-preview" aria-label="Tu personaje personalizado"><div class="wardrobe-avatar">${renderAvatar(2.2)}</div><h2 data-character-name>${esc(state.avatarName)}</h2><p>${esc(CHARACTER_CATALOG.outfits.find(o=>o.id===a.outfit).label)}</p><span class="wardrobe-save-status" role="status" data-avatar-save>${saved?'Cambios guardados automáticamente':'Guardado pendiente: comprueba el aviso'}</span><button class="wardrobe-done" onclick="go('home')">Listo, volver a la aventura</button></section><div class="wardrobe-tabs" aria-label="Secciones de personalización"><button aria-pressed="${wardrobeTab==='traits'}" onclick="setWardrobeTab('traits')">Rasgos</button><button aria-pressed="${wardrobeTab==='closet'}" onclick="setWardrobeTab('closet')">Armario</button></div><section class="wardrobe-panel wardrobe-traits" aria-label="Rasgos del personaje"><h2>Tu esencia</h2><div class="wardrobe-name"><label for="avname">Nombre del personaje</label><input id="avname" maxlength="32" value="${esc(state.avatarName)}" oninput="updateAvatarName(this.value)"></div><fieldset class="character-options"><legend>Familia</legend><div class="choice-row">${CHARACTER_CATALOG.families.map(f=>`<button class="choice" ${f.available?'aria-pressed="true"':'disabled'}>${f.label}${f.available?'':' · Próximamente'}</button>`).join('')}</div></fieldset>${colors('skin','Piel')}${choices('face','Rostro',CHARACTER_CATALOG.face)}${colors('eyes','Ojos')}${choices('hairStyle','Peinado',CHARACTER_CATALOG.hairStyle)}${colors('hairColor','Color de pelo')}</section><section class="wardrobe-panel wardrobe-closet" aria-label="Armario encantado"><h2>Armario encantado</h2><fieldset class="character-options"><legend>Conjuntos de aventura</legend><div class="outfit-grid">${CHARACTER_CATALOG.outfits.map(o=>`<button class="outfit-card" aria-label="${o.label}, ${outfitOwned(o.id)?'disponible':'bloqueado'}" data-option="outfit:${o.id}" aria-pressed="${a.outfit===o.id}" ${outfitOwned(o.id)?`onclick="chooseCharacter('outfit','${o.id}')"`:'disabled'}><span class="wardrobe-outfit-preview" aria-hidden="true">${renderAvatar(.42,{...a,outfit:o.id})}</span><strong>${o.label}</strong><span>${o.requiredStars===0?'Gratis':outfitOwned(o.id)?'Desbloqueado':`Bloqueado · ${Math.min(totalStars(),o.requiredStars)}/${o.requiredStars} estrellas`}</span></button>`).join('')}</div><p class="wardrobe-help">Los conjuntos se desbloquean con tu progreso real. Las estrellas no se gastan.</p></fieldset><fieldset class="character-options"><legend>Accesorios <small>Gratis</small></legend><div class="wardrobe-accessories">${CHARACTER_CATALOG.accessories.map(o=>`<button class="choice wardrobe-accessory" data-option="accessory:${o.id}" aria-pressed="${a.accessory===o.id}" onclick="chooseCharacter('accessory','${o.id}')">${accessoryArt(o)}<span>${o.label}</span></button>`).join('')}</div><p class="wardrobe-help">Los objetos se ven directamente en tu personaje. Ilustraciones individuales pendientes.</p></fieldset><button class="wardrobe-shop" onclick="sceneAccess('shop')">Tienda · próximamente</button><p class="wardrobe-help">Tus Monedas Estrella están guardadas. Las compras todavía no están activas.</p></section></div></section>`);
 for(const key of ['traits','closet']){const pane=document.querySelector('.wardrobe-'+key);if(pane)pane.scrollTop=scroll[key]}
}
