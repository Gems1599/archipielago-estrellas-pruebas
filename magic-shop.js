/* Storefront uses the existing wallet and pupil session. No optimistic purchase,
   prices or ownership in localStorage, and no browser-only payment fallback. */
let magicShop={owner:null,loaded:false,products:[],error:'',unavailableLabel:'Compras no disponibles',category:'clothing',preview:null,confirm:null,pending:null,busy:false};
function resetMagicShop(){magicShop={owner:null,loaded:false,products:[],error:'',unavailableLabel:'Compras no disponibles',category:'clothing',preview:null,confirm:null,pending:null,busy:false};document.getElementById('shop-recovery')?.remove();document.body.classList.remove('in-magic-shop')}
function syncMagicShop(){document.body.classList.toggle('in-magic-shop',screen==='shop')}
function shopOwned(id){return Object.prototype.hasOwnProperty.call(state.shopInventoryV1?.owned||{},id)}
function shopProduct(id){return SHOP_PRODUCTS.find(p=>p.id===id)}
function shopEquipment(){const equipment={};for(const [slot,id] of Object.entries(state.shopEquipmentV1||{})){const p=shopProduct(id);if(p&&p.slot===slot&&shopOwned(id))equipment[slot]=id}return equipment}
function shopEquipped(id){return Object.values(shopEquipment()).includes(id)}
function shopEquipmentWith(equipment,product){const next={...equipment};if(product.slot==='outfit'){delete next.top;delete next.bottom;delete next.jacket;delete next.feet}else if(['top','bottom'].includes(product.slot))delete next.outfit;next[product.slot]=product.id;return next}
function shopPartStyle(r={scale:1,x:0,y:0}){return `transform-origin:0 0;transform:translate(${r.x/1024*100}%,${r.y/1536*100}%) scale(${r.scale});`}
function shopEquipmentArt(equipment,slots,phase='front'){
 return slots.map(slot=>{const p=shopProduct(equipment[slot]);if(!p)return '';const r=p.registration||{scale:1,x:0,y:0};
  const clip=p.id==='explorer-backpack'?`clip-path:inset(0 ${phase==='behind'?'0 0 63.5%':'36.5% 0 0'});`:'';
  const style=`transform-origin:0 0;transform:translate(${r.x/1024*100}%,${r.y/1536*100}%) scale(${r.scale});${clip}`;
  return `<img data-shop-layer="${p.id}" src="${p.art}" style="${style}" alt="" width="1024" height="1536" draggable="false">`+(p.extraArt||[]).map((file,i)=>`<img data-shop-layer="${p.id}" src="${file}" style="${shopPartStyle(p.extraRegistration?.[i])}" alt="" width="1024" height="1536" draggable="false">`).join('');
 }).join('');
}
function equipShopProduct(id,remove=false){
 if(!shopOwned(id)||magicShop.busy||magicShop.pending)return;const product=shopProduct(id);if(!product)return;
 state.shopEquipmentV1=remove?Object.fromEntries(Object.entries(shopEquipment()).filter(([,v])=>v!==id)):shopEquipmentWith(shopEquipment(),product);
 state.illustratedAvatarV1={...state.illustratedAvatarV1,...layeredGirlSelection(),clothes:['top','bottom','outfit'].includes(product.slot)?'base':layeredGirlSelection().clothes,enabled:true,template:'girl-layered-v1'};
 magicShop.preview=null;save();render();
}
function shopArtPreview(product){
 const layers=[{file:product.art,box:product.bounds||[0,0,1024,1536],reg:product.registration||{scale:1,x:0,y:0}},...(product.extraArt||[]).map((file,i)=>({file,box:product.extraArtBounds?.[i]||[0,0,1024,1536],reg:product.extraRegistration?.[i]||{scale:1,x:0,y:0}}))];
 const boxes=layers.map(({box:[x,y,w,h],reg:r})=>[x*r.scale+r.x,y*r.scale+r.y,w*r.scale,h*r.scale]);
 const left=Math.min(...boxes.map(b=>b[0])),top=Math.min(...boxes.map(b=>b[1])),right=Math.max(...boxes.map(b=>b[0]+b[2])),bottom=Math.max(...boxes.map(b=>b[1]+b[3]));
 return `<svg class="shop-art-preview" viewBox="${left} ${top} ${right-left} ${bottom-top}" role="img" aria-label="${esc(product.name)}">${layers.map(({file,reg:r})=>`<image href="${file}" transform="translate(${r.x} ${r.y}) scale(${r.scale})" x="0" y="0" width="1024" height="1536"/>`).join('')}</svg>`;
}
function shopWardrobe(){
 const items=SHOP_PRODUCTS.filter(p=>shopOwned(p.id));
 return `<section class="shop-owned"><h3>Mi armario mágico</h3>${items.length?`<div class="shop-owned-items">${items.map(p=>`<button class="girl-hair-preview" data-owned-product="${p.id}" onclick="equipShopProduct('${p.id}',${shopEquipped(p.id)})">${shopArtPreview(p)}<strong>${esc(p.name)}</strong><span>${shopEquipped(p.id)?'Equipado · quitar':'Equipar'}</span></button>`).join('')}</div>`:'<p class="wardrobe-help">Aquí aparecerán tus compras. Las opciones básicas siguen siendo gratuitas.</p>'}<button class="wardrobe-shop" onclick="go('shop')">Entrar en la tienda</button></section>`;
}
function shopReadProducts(data){
 if(!Array.isArray(data.products))throw new Error('El catálogo no es válido.');
 return data.products.flatMap(row=>{const local=shopProduct(row.id);if(!local)return [];if(!Number.isSafeInteger(row.price)||row.price<1||row.slot!==local.slot||row.category!==local.category)throw new Error('El catálogo necesita revisión.');return [{...local,price:row.price}]});
}
async function loadMagicShop(){
 const epoch=classroomEpoch,owner=classroomUserId;magicShop.owner=owner;
 try{const data=await StudentAccess.request('/shop',{expectedStudentId:owner});if(epoch!==classroomEpoch)return;magicShop.products=shopReadProducts(data);magicShop.error=''}
 catch(e){if(epoch!==classroomEpoch)return;magicShop.unavailableLabel=e.status===404||e.code==='shop_disabled'?'Tienda sin activar':'Compras no disponibles';magicShop.error=e.status===404?'Falta activar la actualización segura de la tienda en Supabase.':e.message;magicShop.products=[]}
 if(epoch===classroomEpoch){magicShop.loaded=true;if(screen==='shop')renderMagicShop()}
}
function shopTry(id){if(magicShop.busy||magicShop.pending)return;magicShop.preview=id;renderMagicShop()}
function refreshMagicShop(){if(magicShop.busy||magicShop.pending)return;magicShop.loaded=false;magicShop.error='';magicShop.confirm=null;renderMagicShop()}
function shopCategory(value){if(!['clothing','outfits','accessories'].includes(value)||magicShop.busy)return;magicShop.category=value;renderMagicShop()}
function renderMagicShop(){
 syncMagicShop();if(magicShop.owner!==classroomUserId){resetMagicShop();syncMagicShop();magicShop.owner=classroomUserId}
 const available=magicShop.loaded&&!magicShop.error,products=available?magicShop.products:SHOP_PRODUCTS,balance=starCoinStatus().balance;
 const product=shopProduct(magicShop.preview),selection=layeredGirlSelection(),equipment=product?shopEquipmentWith(shopEquipment(),product):shopEquipment();
 const preview=`<span class="storybook-avatar illustrated-girl girl-uses-layers" role="img" aria-label="Vista previa del artículo" style="--girl-width:300px;--girl-height:450px">${girlComposition({...selection,clothes:equipment.outfit||equipment.top||equipment.bottom?'base':selection.clothes},equipment)}</span>`;
 const confirm=magicShop.confirm;
 setApp(`<section class="magic-shop-room ${SHOP_BACKGROUND_FILE?'shop-has-art':''}" aria-label="Tienda mágica">${SHOP_BACKGROUND_FILE?`<img class="shop-background-original" src="${SHOP_BACKGROUND_FILE}" alt="">`:""}<button class="wardrobe-home" onclick="go('home')" aria-label="Inicio"><img src="assets/escenario/optimizado/castillo-central.webp" alt=""><span>Inicio</span></button><div class="wardrobe-wallet" aria-label="Monedas estrella: ${balance}"><span class="scene-coin-symbol" aria-hidden="true"></span><span>Monedas estrella<strong data-shop-balance>${balance}</strong></span></div><header class="shop-heading"><span>Elige algo para tu aventura</span><h1>La tienda mágica</h1></header><div class="shop-layout"><section class="shop-mirror"><div class="shop-avatar">${preview}</div><h2>${product?esc(product.name):esc(state.avatarName)}</h2><p>${product?'Prueba sin guardar: comprar no equipa el artículo.':'Tu apariencia actual'}</p><button class="wardrobe-done" onclick="go('avatar')">Ir a mi vestidor</button></section><section class="shop-shelves" aria-label="Catálogo"><nav class="shop-categories" aria-label="Categorías">${[['clothing','Ropa'],['outfits','Atuendos'],['accessories','Accesorios']].map(([id,label])=>`<button aria-pressed="${magicShop.category===id}" onclick="shopCategory('${id}')">${label}</button>`).join('')}</nav><p class="shop-status" role="status">${!magicShop.loaded?'Consultando el catálogo seguro…':magicShop.error?esc(magicShop.error)+' Vista del catálogo; compras desactivadas.':'Tus compras se guardan en tu partida individual.'}</p>${magicShop.error?'<button class="wardrobe-shop shop-refresh" onclick="refreshMagicShop()">Volver a consultar</button>':''}<div class="shop-grid">${products.filter(p=>p.category===magicShop.category).map(p=>{const owned=shopOwned(p.id),equipped=shopEquipped(p.id),canBuy=available&&!owned&&balance>=p.price;return `<article class="shop-product" data-product="${p.id}"><button class="shop-product-art" aria-label="Probar ${esc(p.name)}" onclick="shopTry('${p.id}')">${shopArtPreview(p)}</button><h3>${esc(p.name)}</h3><p>${owned?'En tu armario':p.price+' Monedas Estrella'}</p><button class="shop-product-action" ${magicShop.busy||equipped||(!owned&&!canBuy)?'disabled':''} onclick="${owned?`equipShopProduct('${p.id}')`:`prepareShopPurchase('${p.id}')`}">${equipped?'Equipado':owned?'Equipar':!magicShop.loaded?'Consultando tienda…':!available?magicShop.unavailableLabel:canBuy?'Comprar':'Monedas insuficientes'}</button></article>`}).join('')}</div><p class="shop-economy-note">Las 30 fases actuales dan hasta 30 monedas. Los atuendos de 40 quedan preparados para futuras recompensas. ${SHOP_BACKGROUND_FILE?'':'El fondo original de la tienda está pendiente de recibir; esta vista utiliza temporalmente el vestidor.'}</p></section></div>${confirm?`<dialog class="shop-confirm" id="shop-confirm"><h2>¿Guardar este tesoro en tu armario?</h2>${shopArtPreview(confirm)}<h3>${esc(confirm.name)}</h3><p>Precio: <strong>${confirm.price}</strong> Monedas Estrella</p><p>Tu saldo: ${balance} · Quedarán: <strong>${balance-confirm.price}</strong></p><p>Después podrás elegir cuándo equiparlo.</p><div><button onclick="cancelShopPurchase()">Ahora no</button><button data-confirm-purchase onclick="confirmShopPurchase()">Confirmar compra</button></div></dialog>`:''}</section>`);
 const dialog=document.getElementById('shop-confirm');if(dialog){dialog.showModal();dialog.addEventListener('cancel',event=>{event.preventDefault();cancelShopPurchase()})}
 if(!magicShop.loaded)loadMagicShop();
}
async function prepareShopPurchase(id){
 if(magicShop.busy||magicShop.pending||shopOwned(id)||magicShop.error)return;magicShop.busy=true;const owner=classroomUserId,epoch=classroomEpoch;
 try{
  while(classroomBusy||classroomDirty){if(classroomFailed)throw new Error('Primero hay que confirmar el guardado de tu partida.');await classroomFlush();if(classroomBusy)await new Promise(r=>setTimeout(r,40))}
  if(epoch!==classroomEpoch)return;
  const data=await StudentAccess.request('/shop',{expectedStudentId:owner});if(epoch!==classroomEpoch)return;
  magicShop.products=shopReadProducts(data);const p=magicShop.products.find(p=>p.id===id);if(!p)throw new Error('El artículo ya no está disponible.');
  if(shopOwned(id))return;if(starCoinStatus().balance<p.price)throw new Error('No tienes suficientes Monedas Estrella.');magicShop.confirm=p;
 }catch(e){if(epoch===classroomEpoch)magicShop.error=e.message}
 finally{if(epoch===classroomEpoch){magicShop.busy=false;if(screen==='shop')renderMagicShop()}}
}
function cancelShopPurchase(){if(magicShop.busy)return;magicShop.confirm=null;renderMagicShop()}
function shopRecovery(message){
 document.getElementById('shop-confirm')?.close();
 classroomFailed=true;document.getElementById('app').inert=true;document.getElementById('shop-recovery')?.remove();
 const panel=document.createElement('aside');panel.id='shop-recovery';panel.className='shop-recovery';panel.setAttribute('role','alert');
 const text=document.createElement('p');text.textContent=message+' No repetiremos el cobro. Comprueba la operación antes de seguir.';
 const retry=document.createElement('button');retry.textContent='Comprobar mi compra';retry.onclick=()=>confirmShopPurchase(true);panel.append(text,retry);document.body.append(panel);
}
async function confirmShopPurchase(retry=false){
 if(magicShop.busy||(!retry&&!magicShop.confirm))return;
 const epoch=classroomEpoch,owner=classroomUserId;
 if(!magicShop.pending){const p=magicShop.confirm;magicShop.pending={studentId:owner,productId:p.id,requestId:crypto.randomUUID(),revision:classroomRevision,priceSeen:p.price}}
 magicShop.busy=true;classroomBusy=true;clearTimeout(classroomTimer);document.getElementById('app').inert=true;
 document.querySelector('#shop-recovery button')?.setAttribute('disabled','');classroomStatus('Confirmando compra segura…');
 try{
  const result=await StudentAccess.request('/shop/purchase',{method:'POST',body:magicShop.pending,expectedStudentId:owner});if(epoch!==classroomEpoch)return;
  if(!result.state||!Number.isSafeInteger(result.revision)||result.revision<classroomRevision)throw new Error('La respuesta no confirma el inventario.');
  prepareClassroomState(result.state);classroomRevision=result.revision;classroomDirty=false;classroomFailed=false;magicShop.pending=null;magicShop.confirm=null;magicShop.preview=null;
  document.getElementById('shop-recovery')?.remove();document.getElementById('app').inert=false;classroomStatus(result.alreadyOwned?'El artículo ya estaba en tu armario. No se ha cobrado otra vez.':'Compra guardada. Puedes equipar el artículo cuando quieras.');
 }catch(e){
  if(epoch!==classroomEpoch)return;
  if(e.status&&e.status<500){
   try{const result=await StudentAccess.request('/game',{expectedStudentId:owner});if(epoch!==classroomEpoch)return;if(result.student?.id!==owner||!result.state||!Number.isSafeInteger(result.revision))throw new Error('No se pudo comprobar tu partida.');prepareClassroomState(result.state);classroomRevision=result.revision;classroomDirty=false;classroomFailed=false;magicShop.pending=null;magicShop.confirm=null;magicShop.preview=null;document.getElementById('shop-recovery')?.remove();document.getElementById('app').inert=false;magicShop.error=e.message;classroomStatus(e.message,true)}catch(problem){shopRecovery(problem.message)}
  }else shopRecovery(e.message);
 }finally{
  if(epoch===classroomEpoch){magicShop.busy=false;classroomBusy=false;if(!classroomFailed&&screen==='shop')renderMagicShop();document.querySelector('#shop-recovery button')?.removeAttribute('disabled')}
 }
}
