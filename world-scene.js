/* Shared world presentation. Mathematics retains its approved geometry and colors.
   Presentation only: the existing question, answer, timer,
   review, unlock and storage functions remain authoritative. */
const WORLD_SCENES={math:'fondo-matematicas',english:'fondo-english',span:'fondo-castellano',val:'fondo-valencia',nature:'fondo-medi-natural'};
const WORLD_STAGE_POINTS=[{x:12,y:57},{x:27,y:28},{x:42,y:57},{x:58,y:28},{x:73,y:57},{x:88,y:28}];
const WORLD_INTROS={math:'Un camino de cristal, treinta pequeñas aventuras',english:'Un camino de palabras, treinta aventuras',span:'Un camino de cuentos, treinta aventuras',val:'Un camí de paraules, trenta aventures',nature:'Un camino de naturaleza, treinta aventuras'};
const WORLD_THEME_KEYS=['base','primary-from','primary-to','hover-from','hover-to','review','review-hover','panel-from','panel-to','option','option-border','option-selected','option-selected-border','button-from','button-to','current-from','current-to','glow','modal-end','pending-from','pending-to'];
const WORLD_THEME_VALUES={
 english:['#3f336b','#65508fe8','#4d3c79e8','#7a63a4e8','#61508ce8','#5c498455','#80699c6b','#f5eefff0','#e9def6ef','#f5f0fb','#cbbcdc','#e2d5f2','#967ab5','#8a72b0','#66518e','#e6d4ff','#b5a0d3','#deccff','#eee4fa','#d4c5e8bb','#9683b7bb'],
 span:['#71485d','#9c586fe8','#79455ce8','#b16c82e8','#8e5670e8','#8d536b55','#a7768a6b','#fff1f3f0','#f4e2e9ef','#fff3f6','#dfbdc9','#f3d6e1','#b48094','#b5798d','#8f5870','#ffe1ea','#d7a1b6','#f7d5e0','#f9e8ee','#e9c8d5bb','#bb92a4bb'],
 val:['#27656c','#287e85e8','#a16c3fe8','#379095e8','#b57b4ce8','#2a777f55','#4f92986b','#fff2e1f0','#dcf2eeef','#f4faf5','#b9d2c7','#d2ece3','#6d9f94','#428e91','#8c6948','#d7f4e9','#87c9bf','#d1f2e5','#f3f1df','#c6e6dfbb','#87b6b0bb'],
 nature:['#284f3c','#3a7351e8','#345f4be8','#4a865fe8','#47775be8','#3c714f55','#628a626b','#f0f9e9f0','#dfeedaef','#f1f8ed','#bdd2b5','#d8ecca','#799e6a','#69965e','#48784e','#e1f3cf','#a3cd92','#d3edbd','#edf5e5','#cfe1c4bb','#91ad82bb']
};
const worldActorPosition={};
function syncWorldScene(){
 const enabled=Boolean(WORLD_SCENES[active])&&(screen==='world'||screen==='question'||screen==='weekly-world');
 document.body.classList.toggle('illustrated-world',enabled);
 document.body.classList.toggle('illustrated-world-question',enabled&&screen==='question');
 for(const key of WORLD_THEME_KEYS)document.body.style.removeProperty('--world-'+key);
 document.body.style.removeProperty('--world-background');
 if(enabled){
  document.body.dataset.worldScene=active;
  document.body.style.setProperty('--world-background',`url("assets/fondos-mundos/optimizado/${WORLD_SCENES[active]}.webp")`);
  const palette=WORLD_THEME_VALUES[active];if(palette)WORLD_THEME_KEYS.forEach((key,i)=>document.body.style.setProperty('--world-'+key,palette[i]));
 }else delete document.body.dataset.worldScene;
 document.body.classList.toggle('math-world',enabled&&active==='math');
 document.body.classList.toggle('math-world-question',enabled&&active==='math'&&screen==='question');
}
function worldSceneNavigation(){return `${coinCounterMarkup()}<div class="world-scene-navigation"><button class="world-corner world-home" data-world-nav="home" onclick="save();go('home')" aria-label="Inicio"><img src="assets/escenario/optimizado/castillo-central.webp" alt="" width="50" height="50"><span>Inicio</span></button><button class="world-corner world-passport" data-world-nav="passport" onclick="save();go('passport')" aria-label="Pasaporte"><img src="assets/interfaz/optimizado/diario-magico.webp" alt="" width="50" height="50"><span>Pasaporte</span></button></div>`}
function worldStages(id=active){
 const p=st(id);return Array.from({length:Math.ceil(QUESTIONS[id].length/5)},(_,g)=>{
  const from=g*5,results=Array.from({length:5},(_,j)=>p.results[from+j]),stars=results.filter(r=>r==='ok').length,done=results.filter(Boolean).length;
  const current=p.index<30&&Math.floor(p.index/5)===g;
  return {g,from,results,stars,done,current,status:stars===5?'completed':current?'current':results.includes('miss')?'review':'pending'};
 });
}
function selectWorldStage(g){
 if(!Number.isInteger(g)||g<0||g>5)return;
 const p=st(active),from=g*5,miss=Array.from({length:5},(_,j)=>from+j).find(i=>p.results[i]==='miss');
 if(p.index<30&&Math.floor(p.index/5)===g){startRound();return}
 if(miss!==undefined){selectStop(miss);return}
 if(Array.from({length:5},(_,j)=>p.results[from+j]).every(r=>r==='ok')){selectStop(from);return}
 showModal('Sigue el camino','Completa tu etapa actual para avanzar a la siguiente.','');
}
function positionWorldActor(element,point,context){
 if(!element)return;
 const key=active+':'+context,previous=worldActorPosition[key]||point;
 element.style.left=previous.x+'%';element.style.top=previous.y+'%';
 worldActorPosition[key]=point;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{if(element.isConnected){element.style.left=point.x+'%';element.style.top=point.y+'%'}}));
}
function renderIllustratedWorld(){
 syncWorldScene();const id=active,w=world(id),subject=SCENE_SUBJECTS[id],p=st(id),stages=worldStages(id),done=allDone(id),errors=pending(id).length;
 const group=Math.min(5,Math.floor(p.index/5));
 setApp(`<section class="world-scene" aria-label="Recorrido de ${subject}">${worldSceneNavigation()}<header class="world-heading"><span class="world-eyebrow">${id==='val'?'Jardins de Valencià':w.name} · ${w.character}</span><h1>${subject}</h1><p>${WORLD_INTROS[id]}</p><div class="world-real-progress"><span>${correctCount(id)}/30 estrellas</span><span>${attempted(id)}/30 pruebas realizadas</span><span>Tiempo disponible: ${formatTime(p.remaining)}</span></div></header><div class="world-route-map" aria-label="Seis etapas de cinco preguntas"><svg class="world-route-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M12 57 C17 57 21 28 27 28 S36 57 42 57 S52 28 58 28 S67 57 73 57 S82 28 88 28"/></svg>${stages.map(s=>{const point=WORLD_STAGE_POINTS[s.g];const label={completed:'completada',current:'actual',review:'con errores para repasar',pending:'pendiente'}[s.status];return `<button class="world-stage-stop stage-${s.status}" data-stage="${s.g}" style="left:${point.x}%;top:${point.y}%" onclick="selectWorldStage(${s.g})" aria-label="Etapa ${s.g+1}, preguntas ${s.from+1} a ${s.from+5}, ${s.stars} de 5 estrellas, ${label}" ${s.current?'aria-current="step"':''}><span class="world-stage-star" aria-hidden="true"></span><strong>Etapa ${s.g+1}</strong><span class="world-stage-count">${s.stars}/5 estrellas</span><span class="world-mini-stars" aria-hidden="true">${s.results.map(r=>`<i class="mini-${r||'pending'}"></i>`).join('')}</span><small>${s.from+1}–${s.from+5}</small></button>`}).join('')}<div id="world-route-avatar" class="world-route-avatar" aria-label="${esc(state.avatarName)}, tu personaje"><div class="world-avatar-idle">${renderAvatar(.65)}</div></div></div><div class="world-companion" aria-label="${w.character} te acompaña">${guardianArt(id,'welcome',150)}<span>${w.character} está contigo</span></div><div class="world-route-actions"><button class="world-primary-action" onclick="startRound()" ${done?'disabled':''}>${done?'Recorrido completado':p.started?'Continuar aventura':'Comenzar aventura'}</button><button class="world-review-action" onclick="startReview()" ${errors?'':'disabled'}>Repasar errores${errors?' · '+errors:''}</button><p>${errors?'Las preguntas pendientes se repasan sin cronómetro.':done?'¡Has iluminado todo el camino!':'No hay errores pendientes de repaso.'}</p><div class="world-route-key"><span>Oro: conseguida</span><span>${id==='math'?'Luz azul':'Resplandor'}: etapa actual</span><span>Ámbar: repaso</span></div></div></section>`);
 positionWorldActor($('world-route-avatar'),WORLD_STAGE_POINTS[group],'route');
}
function decorateWorldQuestion(reset=true){
 syncWorldScene();if(screen!=='question'||!WORLD_SCENES[active])return;
 if(reset)window.scrollTo({top:0,behavior:'instant'});
 const question=document.querySelector('.question-grid');if(!question)return;
 question.classList.add('illustrated-question');
 const nav=document.createElement('div');nav.innerHTML=worldSceneNavigation();question.prepend(nav);
 const stage=Math.min(5,Math.floor(currentIndex()/5));
 const journey=document.createElement('div');journey.className='world-question-journey';journey.setAttribute('aria-label',`Etapa ${stage+1} de 6`);
 journey.innerHTML=`<div class="world-question-stage-stars">${Array.from({length:6},(_,i)=>`<span class="${i===stage?'question-current-stage':''}">${i+1}</span>`).join('')}</div><div id="world-question-avatar" class="world-question-avatar"><div class="world-avatar-idle ${feedback?.ok?'everluna-avatar-cheer':''}">${renderAvatar(.34)}</div></div>`;
 question.prepend(journey);
 const companion=document.createElement('div');companion.className='world-question-companion';companion.innerHTML=guardianArt(active,'welcome',125);question.append(companion);
 const label=question.querySelector('.progress-banner .label');if(label)label.textContent=review?`${SCENE_SUBJECTS[active]} · Repaso`:`${SCENE_SUBJECTS[active]} · Prueba ${Math.min(currentIndex()+1,30)} de 30`;
 positionWorldActor($('world-question-avatar'),{x:5+stage*18,y:0},'question');
}
