/* Adapter only; no secrets, new accounts or changes to the normal question engine. */
let magicMissionView=null,magicMissionNoticeEpoch=0;
function destroyMagicMissions(){magicMissionNoticeEpoch++;magicMissionView?.destroy();magicMissionView=null;document.querySelectorAll('.mission-launch-notice').forEach(e=>e.remove());document.body.classList.remove('in-missions')}
async function missionGameRequest(path,options={}){
 const epoch=classroomEpoch,owner=classroomUserId;if(!classroomReady||!owner)throw new Error('Inicia sesión primero.');
 // Flush pending gameplay before economy operations. Never replace newer gameplay with a returned snapshot.
 if(path==='/missions/start'||path==='/missions/submit'){
  while(classroomBusy||classroomDirty){if(classroomFailed)throw new Error('Confirma primero el guardado de tu partida.');await classroomFlush();await new Promise(r=>setTimeout(r,40))}
 }
 const data=await StudentAccess.request(path,{...options,expectedStudentId:owner});
 if(path==='/missions'&&epoch===classroomEpoch){const current=await StudentAccess.request('/game',{expectedStudentId:owner});if(epoch===classroomEpoch&&owner===classroomUserId&&current.state?.futureFeatures?.currency)missionGameWallet(current.state.futureFeatures.currency);}
 if(epoch!==classroomEpoch||owner!==classroomUserId)throw new Error('La sesión ha cambiado.');
 return data;
}
function missionGameWallet(wallet){if(!wallet||!Number.isSafeInteger(wallet.balance)||wallet.balance<0)return;state.futureFeatures.currency=structuredClone(wallet);document.querySelectorAll('.scene-coin-value').forEach(e=>e.textContent=String(wallet.balance))}
function renderMagicMissions(){
 magicMissionView?.destroy();document.body.classList.add('in-missions');setApp('<section id="mission-game-host"></section>');
 magicMissionView=MagicMissions.mount(document.getElementById('mission-game-host'),{role:'student',request:missionGameRequest,onHome:()=>go('home'),balance:()=>starCoinStatus().balance,onWallet:missionGameWallet});
}
async function announceMagicMissions(){
 const epoch=++magicMissionNoticeEpoch,owner=classroomUserId;
 try{
  const data=await missionGameRequest('/missions');if(epoch!==magicMissionNoticeEpoch||!classroomReady||owner!==classroomUserId||screen!=='home')return;
  // Expiry can credit coins even while no mission screen was open. Fetch only protected wallet.
  const pending=(data.missions||[]).filter(m=>!m.attempts||m.ongoing);if(!pending.length)return;
  const m=pending[0],notice=document.createElement('aside');notice.className='mission-launch-notice';notice.setAttribute('aria-label','Nueva misión mágica');
  notice.innerHTML=MagicMissions.guardian(m.world);const speech=document.createElement('p');speech.textContent=m.story||'¡Explorador! Tu guardián necesita tu ayuda. Tienes una misión mágica disponible.';notice.append(speech);
  const button=document.createElement('button');button.textContent=pending.length>1?'Elegir misión':'Comenzar misión';button.onclick=()=>go('missions');const close=document.createElement('button');close.textContent='Más tarde';close.onclick=()=>notice.remove();notice.append(button,close);document.body.append(notice);
 }catch{/* Older Edge functions remain compatible; the hub explains pending activation. */}
}
