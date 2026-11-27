/* Supabase Edge transport. Game state remains unchanged; no localStorage profile,
   Netlify API, pupil email, service key or persistent browser session is used. */
let classroomUserId=null,classroomRevision=0,classroomReady=false,classroomFailed=false,classroomTimer=null,classroomBusy=false,classroomDirty=false,classroomEpoch=0,classroomSavedSnapshot=null,classroomPendingSave=null;
function classroomStatus(message,error=false){let el=document.getElementById('cloud-status');if(!el){el=document.createElement('div');el.id='cloud-status';el.setAttribute('role','status');document.body.append(el)}el.className='cloud-status'+(error?' cloud-error':'');el.textContent=message}
function classroomResetView(){
 destroyWeeklyWorld();classroomWorldContentEnabled=false;weeklyProgressByWorld.clear();
 destroyMagicMissions();resetStickerCelebrations();resetMedalCelebrations();
 resetMagicShop();
 clearTimeout(classroomTimer);stopTimer();cancelMapJourney();document.getElementById('app').inert=false;classroomReady=false;classroomFailed=false;classroomDirty=false;classroomBusy=false;classroomUserId=null;classroomRevision=0;classroomSavedSnapshot=null;classroomPendingSave=null;
 screen='home';active='math';review=false;feedback=null;selection='';pairState={};classState={};showHint=false;paused=false;expired=false;noTime=false;modal=null;recentUnlocks=[];
 document.body.classList.remove('scene-home','in-wardrobe','in-medal-room','in-sticker-album','illustrated-world','world-scene-active','math-world','math-world-question');
 document.body.classList.add('classroom-gate');syncWorldScene();syncWardrobePresentation();syncMedalRoomPresentation();syncStickerAlbum();
 document.getElementById('cloud-status')?.remove();document.querySelector('.cloud-logout')?.remove();
}
function classroomBoot(message=''){
 classroomEpoch++;classroomResetView();prepareClassroomState({});StudentAccess.showLogin(document.getElementById('app'),classroomConnect,message);
}
async function classroomConnect(user){
 const epoch=++classroomEpoch;classroomReady=false;classroomFailed=false;classroomDirty=false;classroomBusy=false;clearTimeout(classroomTimer);
 try{
  const checked=await StudentAccess.request('/session',{expectedStudentId:user.id});
  if(epoch!==classroomEpoch)return;
  if(window.ARCHIPELAGO_SUPABASE?.requirePrivateWorlds&&checked.worldContentEnabled!==true)throw new Error('El contenido privado del aula de pruebas todavía no está disponible.');
  const loaded=await StudentAccess.request('/game',{expectedStudentId:user.id});
  if(epoch!==classroomEpoch)return;
  if(checked.student?.id!==user.id||loaded.student?.id!==user.id)throw new Error('La sesión cambió durante el acceso.');
  if(!Number.isSafeInteger(loaded.revision)||loaded.revision<0||(loaded.state===null&&loaded.revision!==0)||(loaded.state!==null&&(!loaded.state||typeof loaded.state!=='object'||Array.isArray(loaded.state))))throw new Error('La partida necesita revisión. No se ha sobrescrito.');
  let weeklyProgressUnavailable=false;
  if(checked.worldContentEnabled===true&&loaded.state?.futureFeatures?.currency){
   try{
    const history=await StudentAccess.request('/world-content/history',{expectedStudentId:user.id});
    if(epoch!==classroomEpoch)return;
    if(!Array.isArray(history.runs))throw new Error('Historial semanal inválido.');
    history.runs.forEach(recordWeeklyProgress);
   }catch{
    if(epoch!==classroomEpoch)return;
    weeklyProgressUnavailable=true;
   }
  }
  classroomWorldContentEnabled=checked.worldContentEnabled===true;prepareClassroomState(loaded.state||{});classroomUserId=user.id;classroomRevision=loaded.revision;classroomReady=true;
  if(loaded.state===null)state.avatarName=user.nickname;document.body.classList.toggle('reduced',!state.motion);document.body.classList.remove('classroom-gate');
  classroomSavedSnapshot=loaded.state===null?null:JSON.stringify(loaded.state);
  reconcileMedalCollection('migration');reconcileStarCoins();reconcileStickers();save();render();
  const logout=document.createElement('button');logout.className='cloud-logout';logout.textContent='Cerrar sesión';logout.onclick=()=>classroomLogout();document.body.append(logout);
  classroomStatus('Partida de '+user.nickname+(classroomDirty?' · preparando guardado online':' · recuperada online'));
  if(weeklyProgressUnavailable)showModal('Progreso semanal pendiente de cargar','Abre un mundo para recuperar su recorrido guardado o vuelve a iniciar sesión para consultar todos los mundos.','🌟');
  announceMagicMissions();
 }catch(e){if(epoch===classroomEpoch){StudentAccess.forget();if(classroomReady)classroomBoot(e.message)}throw e}
}
function classroomScheduleSave(){if(!classroomReady||classroomFailed)return false;if(!classroomBusy&&!classroomDirty&&JSON.stringify(state)===classroomSavedSnapshot)return true;classroomDirty=true;classroomStatus('Guardando partida…');clearTimeout(classroomTimer);classroomTimer=setTimeout(classroomFlush,300);return true}
function classroomSaveFailure(error){
 classroomDirty=true;classroomFailed=true;stopTimer();document.getElementById('app').inert=true;classroomStatus(error.message+' No se ha confirmado el guardado.',true);
 const notice=document.getElementById('cloud-status'),backup=document.createElement('button');backup.textContent='Descargar copia de seguridad';backup.onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(state)],{type:'application/json'}));a.href=url;a.download='partida-para-revision.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const retry=document.createElement('button');retry.textContent='Reintentar guardado';retry.onclick=()=>{if(error.status===409||error.status===401){retry.textContent='Conserva tu copia y vuelve a entrar';retry.disabled=true;return}classroomFailed=false;classroomFlush()};
 const leave=document.createElement('button');leave.textContent='Cerrar sesión con cambios pendientes';leave.onclick=()=>{if(confirm('Hay cambios sin confirmar. Descarga antes una copia para revisión. ¿Cerrar esta sesión sin mezclarla con otra cuenta?'))classroomLogout(true)};
 notice.append(backup,retry,leave);
}
async function classroomFlush(){
 clearTimeout(classroomTimer);if(classroomBusy||!classroomDirty||classroomFailed||!classroomReady)return;
 if(!classroomPendingSave&&JSON.stringify(state)===classroomSavedSnapshot){classroomDirty=false;classroomStatus('Partida guardada online');return;}
 const epoch=classroomEpoch,owner=classroomUserId;
 classroomPendingSave??={snapshot:JSON.stringify(state),revision:classroomRevision,requestId:crypto.randomUUID()};
 const {snapshot,revision,requestId}=classroomPendingSave;classroomBusy=true;classroomDirty=false;
 try{const data=await StudentAccess.request('/game',{method:'PUT',body:{studentId:owner,state:JSON.parse(snapshot),revision,requestId},expectedStudentId:owner,keepalive:new TextEncoder().encode(snapshot).length<55000});
  if(epoch!==classroomEpoch)return;if(!Number.isSafeInteger(data.revision)||data.revision<=revision)throw new Error('No se pudo confirmar la revisión guardada.');classroomRevision=data.revision;if(data.state){const wallet=data.state.futureFeatures?.currency;if(!wallet||!Number.isSafeInteger(wallet.balance)||wallet.balance<0)throw new Error('Saldo no confirmado por el servidor.');state.futureFeatures.currency=structuredClone(wallet);state.shopInventoryV1=structuredClone(data.state.shopInventoryV1)}document.getElementById('app').inert=false;classroomSavedSnapshot=snapshot;classroomPendingSave=null;classroomStatus('Partida guardada online');
 }catch(e){if(epoch===classroomEpoch)classroomSaveFailure(e)}
 finally{if(epoch===classroomEpoch){classroomBusy=false;if(!classroomFailed&&JSON.stringify(state)!==classroomSavedSnapshot)classroomDirty=true;if(classroomDirty&&!classroomFailed)classroomTimer=setTimeout(classroomFlush,300)}}
}
async function classroomLogout(force=false){
 if(!force){try{await magicMissionView?.flush();await weeklyWorldView?.flush()}catch(e){classroomStatus('No se ha cerrado la sesión: hay respuestas de la actividad pendientes. '+e.message,true);return}while(classroomBusy||classroomDirty){if(classroomFailed)return;await classroomFlush();await new Promise(r=>setTimeout(r,40))}if(classroomFailed)return}
 const epoch=++classroomEpoch;clearTimeout(classroomTimer);classroomReady=false;
 classroomResetView();prepareClassroomState({});
 StudentAccess.showLoading(document.getElementById('app'),'Cerrando sesión…');
 let warning='';try{await StudentAccess.logout()}catch{warning='Sesión eliminada de esta pestaña. No se pudo confirmar su revocación en el servidor.'}
 if(epoch===classroomEpoch)classroomBoot(warning);
}
window.addEventListener('pagehide',()=>{if(classroomReady&&!classroomFailed){if(JSON.stringify(state)!==classroomSavedSnapshot)classroomDirty=true;if(!classroomBusy)classroomFlush()}});
window.addEventListener('beforeunload',event=>{if(classroomReady&&(classroomDirty||classroomBusy)){classroomFlush();event.preventDefault();event.returnValue=''}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&classroomReady)queueMicrotask(classroomFlush)});
window.addEventListener('focus',async()=>{if(!classroomReady||classroomFailed)return;const epoch=classroomEpoch;try{const result=await StudentAccess.request('/session',{expectedStudentId:classroomUserId});if(result.student?.id!==classroomUserId)throw new Error('La sesión no corresponde a esta partida.')}catch(e){if(epoch===classroomEpoch)classroomSaveFailure(e)}});
