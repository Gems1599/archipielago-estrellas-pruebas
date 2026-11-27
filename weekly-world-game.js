/* Main-game weekly world view. Questions are public; grading/persistence belong
   to the authenticated server. Existing original rewards remain separate. */
let weeklyWorldView=null,classroomWorldContentEnabled=false;
const weeklyProgressByWorld=new Map();
function recordWeeklyProgress({world:id,answered,correct}){
 if(!world(id)||!Number.isInteger(answered)||!Number.isInteger(correct)||correct<0||answered<correct||answered>30)return;
 const previous=weeklyProgressByWorld.get(id);
 // One confirmed run per world counts on the map; versions and retries never add stars together.
 const best=!previous||correct>previous.correct||(correct===previous.correct&&answered>previous.answered)
  ? {answered,correct}:previous;
 weeklyProgressByWorld.set(id,{...best,maxAnswered:Math.max(answered,previous?.maxAnswered??0)});
}
function mapWorldProgress(id){
 const legacy={answered:attempted(id),correct:correctCount(id)};
 return (classroomWorldContentEnabled&&weeklyProgressByWorld.get(id))||legacy;
}
function rewardWorldProgress(id){
 const results=QUESTIONS[id].map((_,i)=>st(id).results[i]);
 const weekly=classroomWorldContentEnabled?weeklyProgressByWorld.get(id):null;
 return {
  answered:Math.max(results.filter(result=>result==='ok'||result==='miss').length,weekly?.maxAnswered??0),
  correct:Math.max(results.filter(result=>result==='ok').length,weekly?.correct??0)
 };
}
function destroyWeeklyWorld(){weeklyWorldView?.destroy();weeklyWorldView=null;}
async function openWeeklyWorld(worldId){
 destroyWeeklyWorld();const epoch=classroomEpoch,owner=classroomUserId;
 active=worldId;go('weekly-world');setApp('<section class="magic-missions weekly-world" id="weekly-world-host"></section>');
 const host=document.getElementById('weekly-world-host');let alive=true,run=null,index=0,value='',feedback=null,busy=false,dirty=false,pending=null,clock=null,clockStarted=Date.now();
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const valid=()=>alive&&epoch===classroomEpoch&&owner===classroomUserId;
 const waitForGameSave=async()=>{
  while(classroomBusy||classroomDirty){if(classroomFailed)throw Error('Confirma primero el guardado de tu partida.');await classroomFlush();await new Promise(r=>setTimeout(r,30));if(!valid())throw Error('La sesión cambió.');}
 };
 const request=async(path,options)=>{
  await waitForGameSave();
  const data=await StudentAccess.request(path,{...options,expectedStudentId:owner});if(!valid())throw Error('La sesión cambió.');return data;
 };
 const client=WorldContentIntegration.worldContentStudentClient(request,{enabled:true});
 const button=(text,action,attrs='')=>`<button type="button" data-weekly="${action}" ${attrs}>${esc(text)}</button>`;
 function layout(body){if(!valid())return;clearInterval(clock);host.innerHTML=`<div class="mission-shell"><nav class="mission-navigation">${button('Volver al mapa','home')}<span>${state.futureFeatures.currency.balance} monedas estrella</span></nav><div class="mission-content">${body}</div><p role="status" class="weekly-status"></p></div>`;host.onclick=e=>{const b=e.target.closest('[data-weekly]');if(b&&!b.disabled)void action(b.dataset.weekly,b)};host.oninput=host.onchange=null;}
 function accept(data,mode='migration'){run=data.run;active=worldId=run.world;syncWorldScene();
  const results=Object.values(run.results);
  recordWeeklyProgress({world:run.world,answered:results.length,correct:results.filter(result=>result==='ok').length});
  missionGameWallet(data.wallet);
  if(data.legacyWorld){
   classroomRevision=data.gameRevision;
   state.worlds[run.world]=structuredClone(data.legacyWorld);
  }
  reconcileStickers(mode);
  if(data.legacyWorld){checkAwards();save()}
  else reconcileMedalCollection(mode);
 }
 function status(message){const el=host.querySelector('.weekly-status');if(el)el.textContent=message;}
 function route(){dirty=false;feedback=null;layout(`<div class="mission-intro">${MagicMissions.guardian(worldId)}<div><h1>${esc(world(worldId).name)}</h1><p>${esc(run.weekName)} · Versión conservada</p><p>${Object.keys(run.results).length}/30 respondidas · ${Object.values(run.results).filter(x=>x==='ok').length}/30 correctas</p></div></div><div class="content-route">${run.questions.map((q,i)=>button((i+1)+' · '+(run.results[q.id]==='ok'?'⭐':run.results[q.id]==='miss'?'Repasar':'Pendiente'),'question',`data-index="${i}" ${i>(run.progress.index||0)&&!run.results[q.id]?'disabled':''}`)).join('')}</div>${button('Continuar recorrido','continue')}${button('Repasar errores','review')}${button('Consultar preguntas disponibles','refresh')}${button('Recorridos anteriores','history')}`);}
 function input(q){
  if(['choice','story'].includes(q.type))return `<div class="mission-choices">${q.options.map((o,i)=>`<button type="button" data-weekly="choose" data-index="${i}" aria-pressed="${value===o}">${esc(o)}</button>`).join('')}</div>`;
  if(q.type==='fill')return `<label>Tu respuesta<input data-weekly-answer value="${esc(value||'')}" autocomplete="off" maxlength="6000"></label>`;
  const choices=q.type==='match'?q.options:q.categories;
  return q.items.map((item,i)=>`<label class="mission-pair">${esc(item)}<select data-weekly-pair="${i}"><option value="">Selecciona…</option>${choices.map(o=>`<option value="${esc(o)}" ${value?.[i]===o?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`).join('');
 }
 function question(reset=true){if(reset){value=structuredClone(run.answers[run.questions[index].id]??'');feedback=null;dirty=false;pending=null;}const q=run.questions[index];layout(`<div class="mission-run-head">${MagicMissions.guardian(run.world)}<div><h1>${esc(world(run.world).name)}</h1><p>${esc(run.weekName)} · Pregunta ${index+1} de 30</p></div><output class="weekly-clock"></output></div><section class="mission-question"><h2>${esc(q.prompt)}</h2>${q.image?`<img class="mission-question-image" src="${esc(q.image)}" alt="Ilustración de la pregunta">`:''}${feedback?`<div class="content-feedback"><h3>${feedback.ok?'Respuesta correcta':'Puedes seguir aprendiendo'}</h3><p>${esc(feedback.explain)}</p><p>Solución: ${esc(JSON.stringify(feedback.answer))}</p></div>`:input(q)}</section><div class="mission-actions">${!feedback?button('Comprobar respuesta','answer')+button('Pista','hint'):button('Siguiente pregunta','next')}${button('Ver recorrido','route')}</div><p>Comprueba tu respuesta para guardarla en tu cuenta.</p>`);
  host.oninput=e=>{if(e.target.matches('[data-weekly-answer]')){value=e.target.value;dirty=true;pending=null;}};
  host.onchange=e=>{if(e.target.matches('[data-weekly-pair]')){value=[...host.querySelectorAll('[data-weekly-pair]')].map(el=>el.value);dirty=true;pending=null;}};
  const tick=()=>{const el=host.querySelector('.weekly-clock');if(el)el.textContent='⏱ '+formatTime(Math.max(0,(run.progress.remaining??1800)-Math.floor((Date.now()-clockStarted)/1000)))};tick();clock=setInterval(tick,1000);
 }
 async function action(type,b){if(busy||!valid())return;busy=true;host.inert=true;try{
  if(type==='home'){if(!dirty||confirm('Esta respuesta aún no se ha comprobado. ¿Volver al mapa?'))go('home');return}
  if(type==='choose'){value=run.questions[index].options[Number(b.dataset.index)];dirty=true;pending=null;question(false);return}
  if(type==='question'){index=Number(b.dataset.index);question();return}
  if(type==='continue'||type==='review'){const i=run.questions.findIndex(q=>type==='review'?run.results[q.id]==='miss':!run.results[q.id]);if(i<0){status(type==='review'?'No hay errores pendientes.':'Recorrido completado. Puedes repasar sus preguntas.');return}index=i;question();return}
  if(type==='route'){if(!dirty||confirm('Esta respuesta aún no se ha comprobado. ¿Ver el recorrido?'))route();return}
  if(type==='next'){if(index===29){route();return}index++;question();return}
  if(type==='history'){const data=await request('/world-content/history');layout('<h1>Historial de recorridos</h1>'+data.runs.map(r=>button(r.weekName+' · '+world(r.world).name+' · '+r.correct+'/30 correctas','open-run',`data-run="${esc(r.id)}"`)).join('')+button('Volver al recorrido','route'));return}
  if(type==='open-run'){accept(await request('/world-content/get',{method:'POST',body:{runId:b.dataset.run}}));clockStarted=Date.now();route();return}
  if(type==='refresh'){accept(await client.start(worldId));clockStarted=Date.now();route();return}
  if(type==='hint'){const data=await request('/world-content/hint',{method:'POST',body:{runId:run.id,questionId:run.questions[index].id}});status(data.hint);return}
  if(type==='answer'){
   // Capture the game revision only after pending collection/avatar saves
   // complete. The transport used to wait after constructing this payload.
   await waitForGameSave();
   pending??={revision:run.revision,gameRevision:classroomRevision,requestId:crypto.randomUUID()};const data=await client.answer(run,run.questions[index].id,value,pending);accept(data,'gameplay');feedback=data.feedback;dirty=false;pending=null;clockStarted=Date.now();question(false);return;
  }
 }catch(e){if(valid())status(e.message+' La operación no está confirmada.')}finally{busy=false;if(valid())host.inert=false}}
 const unload=e=>{if(dirty||busy){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',unload);
 weeklyWorldView={destroy(){alive=false;clearInterval(clock);window.removeEventListener('beforeunload',unload);host.onclick=host.oninput=host.onchange=null},async flush(){if(dirty||busy)throw Error('Comprueba la respuesta pendiente del recorrido antes de cerrar sesión.')}};
 layout('<h1>Preguntas de los mundos</h1><p>Cargando tu recorrido…</p>');try{accept(await client.start(worldId));clockStarted=Date.now();route()}catch(e){if(valid())status(e.message+' No se ha abierto una partida alternativa.');}
}
