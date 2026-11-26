/* Generated from content/world-content.mjs; demo domain only. */
(()=>{
/* World content domain, separate from mission data and production gameplay. */
const CONTENT_WORLDS={math:'Matemáticas',english:'English',span:'Castellano',val:'Valencià',nature:'Medi Natural'};
const CONTENT_TYPES={choice:'Opción múltiple',fill:'Respuesta escrita corta',match:'Relacionar',classify:'Clasificar',story:'Problema con opciones'};
const copy=x=>structuredClone(x);
function contentNorm(v,strict=false){const x=String(v??'').trim().toLocaleLowerCase('es').replace(/\s+/g,' ');return strict?x:x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.,\s](?=\d{3}(?:\D|$))/g,'').replace(/\s/g,'')}
function questionErrors(q){
 const e=[],text=(v,max=6000)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
 if(!q||typeof q!=='object')return ['Pregunta inválida'];
 if(!/^[a-z0-9][a-z0-9_-]{2,79}$/.test(q.id||'')||Object.hasOwn(Object.prototype,q.id))e.push('ID obligatorio: letras minúsculas, números, guiones; entre 3 y 80 caracteres.');
 if(!Object.hasOwn(CONTENT_TYPES,q.type))e.push('Tipo no compatible con los mundos.');
 if(!text(q.prompt))e.push('Falta el enunciado (máximo 6000 caracteres).');
 if(['choice','story'].includes(q.type)){
  if(!Array.isArray(q.options)||q.options.length<2||q.options.length>12||q.options.some(x=>!text(x,500)))e.push('Añade entre 2 y 12 opciones completas.');
  else {if(new Set(q.options).size!==q.options.length)e.push('Hay opciones equivalentes o repetidas.');if(!text(q.answer)||!q.options.includes(q.answer))e.push('La solución debe coincidir exactamente con una opción.');}
 }
 if(q.type==='fill'&&!text(q.answer))e.push('Falta la respuesta escrita correcta.');
 if(q.type==='match'){
  if(!Array.isArray(q.answer)||q.answer.length<2||q.answer.length>12||q.answer.some(p=>!Array.isArray(p)||p.length!==2||p.some(x=>!text(x,500))))e.push('Añade entre 2 y 12 parejas completas.');
  else if(new Set(q.answer.map(p=>p[0])).size!==q.answer.length)e.push('Las entradas de la izquierda deben ser distintas.');
 }
 if(q.type==='classify'){
  const a=q.answer;if(!a||!Array.isArray(a.categories)||a.categories.length<2||a.categories.length>8||a.categories.some(x=>!text(x,500))||new Set(a.categories).size!==a.categories.length)e.push('Añade entre 2 y 8 categorías distintas.');
  if(!Array.isArray(a?.items)||a.items.length<1||a.items.length>20||a.items.some(p=>!Array.isArray(p)||p.length!==2||!text(p[0],500)||!a.categories?.includes(p[1])))e.push('Cada elemento debe tener una categoría válida.');
 }
 for(const k of ['explain','hint'])if(q[k]!==undefined&&(typeof q[k]!=='string'||q[k].length>6000))e.push('Explicación o pista demasiado larga.');
 if(q.image&&!(typeof q.image==='string'&&q.image.length<2800000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(q.image)))e.push('Utiliza una imagen PNG/JPEG/WebP de menos de 2 MB.');
 return e;
}
function questionWarnings(q){return ['choice','story'].includes(q.type)&&q.options&&new Set(q.options.map(x=>contentNorm(x,q.strict))).size!==q.options.length?['Con la comparación actual, algunas opciones equivalen por tildes o espacios. Revisa si debe marcarse la regla estricta.']:[]}
function gradeWorldQuestion(q,value){
 if(q.type==='match')return Array.isArray(value)&&value.length===q.answer.length&&q.answer.every((p,i)=>value[i]===p[1]);
 if(q.type==='classify')return Array.isArray(value)&&value.length===q.answer.items.length&&q.answer.items.every((p,i)=>value[i]===p[1]);
 return contentNorm(value,q.strict)===contentNorm(q.answer,q.strict);
}
function contentFingerprint(q){return JSON.stringify([q.type,contentNorm(q.prompt,true),q.options||[],q.answer,q.strict===true])}
function publicationErrors(week,worlds=Object.keys(CONTENT_WORLDS)){
 const e=[];if(!week.name?.trim())e.push('Escribe el nombre de la semana.');
 if(!worlds.length||worlds.some(w=>!Object.hasOwn(CONTENT_WORLDS,w)))e.push('Selecciona mundos válidos.');
 for(const w of worlds){const sets=week.sets.filter(s=>s.world===w),assigned=new Set();if(!sets.length)e.push(`${CONTENT_WORLDS[w]}: falta un conjunto.`);
  for(const s of sets){const qs=s.questions.filter(q=>!q.archived),ids=new Set(),fps=new Set();
   if(!s.name?.trim())e.push(`${CONTENT_WORLDS[w]}: falta el nombre del conjunto.`);
   if(qs.length!==30)e.push(`${CONTENT_WORLDS[w]} / ${s.name}: necesita exactamente 30 preguntas activas; tiene ${qs.length}.`);
   if(!s.students.length)e.push(`${s.name}: selecciona al menos un alumno.`);
   for(const id of s.students){if(assigned.has(id))e.push(`${CONTENT_WORLDS[w]}: ${id} tiene dos conjuntos asignados.`);assigned.add(id)}
   for(const q of qs){questionErrors(q).forEach(x=>e.push(`${s.name} / ${q.id||'Sin ID'}: ${x}`));if(ids.has(q.id))e.push(`${s.name}: ID repetido ${q.id}`);ids.add(q.id);const fp=contentFingerprint(q);if(fps.has(fp))e.push(`${s.name}: pregunta duplicada (${q.id}).`);fps.add(fp)}
  }
 }return e;
}
function importIntoSet(set,incoming,mode){
 const result=copy(set),skipped=[];if(!['add','replace','update'].includes(mode))throw new Error('Modo de importación inválido.');
 if(incoming.some(q=>questionErrors(q).length))throw new Error('Corrige todas las preguntas antes de importar.');
 const ids=new Set(),fps=new Set();for(const q of incoming){if(ids.has(q.id)||fps.has(contentFingerprint(q)))throw new Error('El documento contiene IDs o preguntas duplicadas.');ids.add(q.id);fps.add(contentFingerprint(q))}
 if(mode==='replace')result.questions=copy(incoming);
 else for(const q of incoming){const i=result.questions.findIndex(old=>old.id===q.id);
  if(mode==='update'){if(i<0)throw new Error(`No existe ${q.id} en el conjunto de destino.`);result.questions[i]=copy(q)}
  else if(i>=0||result.questions.some(old=>contentFingerprint(old)===contentFingerprint(q)))skipped.push(q.id);else result.questions.push(copy(q));
 }
 return {set:result,skipped};
}
class WorldContentDemo {
 constructor(seed,data=null,now=()=>Date.now()){
  this.now=now;this.seed=copy(seed);
  this.data=data||{schema:1,weeks:[{id:'week-1',name:'Semana 1',sets:copy(seed.sets),scheduledAt:''}],publications:[],requests:{},runs:[],ledger:{'demo-estrella':{'math:0':true,'math:1':true,'english:0':true,'nature:0':true},'demo-luna':{}},coins:{'demo-estrella':4,'demo-luna':0},legacy:{'demo-estrella':{avatar:'conservado',medals:['medalla-anterior'],stickers:['cromo-anterior'],inventory:['ropa-anterior'],coins:4,worlds:{math:{results:{0:'ok',1:'ok',2:'miss',3:'ok',4:'ok'}}}}},events:[]};
 }
 week(id){const w=this.data.weeks.find(w=>w.id===id);if(!w)throw new Error('Semana no encontrada.');return w}
 newWeek(name,source=null){if(!name.trim())throw new Error('Escribe un nombre.');const w={id:crypto.randomUUID(),name,sets:source?copy(this.week(source).sets):Object.keys(CONTENT_WORLDS).map(world=>({id:crypto.randomUUID(),world,name:'General',students:[],questions:[]})),scheduledAt:''};this.data.weeks.push(w);return w}
 plan(id,worlds){const w=this.week(id);return {errors:publicationErrors(w,worlds),worlds:worlds.map(world=>({world,sets:w.sets.filter(s=>s.world===world).map(s=>({name:s.name,students:copy(s.students),count:s.questions.filter(q=>!q.archived).length}))})),kept:Object.keys(CONTENT_WORLDS).filter(w=>!worlds.includes(w)),pinned:this.data.runs.filter(r=>!r.finished).length}}
 publish(id,worlds,requestId,activateAt=null){
  const weekSnapshot=this.week(id);const signature=JSON.stringify([id,weekSnapshot.name,[...worlds].sort(),activateAt||'now',weekSnapshot.sets.filter(s=>worlds.includes(s.world))]);
  const replay=this.data.requests[requestId];if(replay){if(replay.signature!==signature)throw new Error('Esta solicitud ya corresponde a otra publicación.');return this.data.publications.find(p=>p.id===replay.id);}
  const week=this.week(id),errors=publicationErrors(week,worlds);if(errors.length)throw new Error(errors.join('\n'));
  if(activateAt&&(!Number.isFinite(Date.parse(activateAt))||Date.parse(activateAt)<=this.now()))throw new Error('Elige una fecha futura o déjala vacía para activar ahora.');
  const p={id:crypto.randomUUID(),sequence:this.data.publications.length+1,weekId:id,weekName:week.name,publishedAt:new Date(this.now()).toISOString(),activateAt:activateAt||new Date(this.now()).toISOString(),worlds:copy(worlds),sets:copy(week.sets.filter(s=>worlds.includes(s.world)).map(s=>({...s,questions:s.questions.filter(q=>!q.archived)})))};
  // Publication itself never changes a wallet, result or in-flight snapshot.
  this.data.publications.push(p);this.data.requests[requestId]={id:p.id,signature};return p;
 }
 restore(publicationId){const p=this.data.publications.find(p=>p.id===publicationId);if(!p)throw new Error('Versión inexistente.');const w=this.week(p.weekId);w.sets=w.sets.filter(s=>!p.worlds.includes(s.world)).concat(copy(p.sets));return w}
 assigned(student,world){if(!Object.hasOwn(this.data.coins,student)||!Object.hasOwn(CONTENT_WORLDS,world))throw new Error('Alumno o mundo no disponible.');const seen=new Set();const pubs=this.data.publications.filter(p=>Date.parse(p.activateAt)<=this.now()).sort((a,b)=>Date.parse(b.activateAt)-Date.parse(a.activateAt)||b.sequence-a.sequence);
  for(const p of pubs){if(!p.worlds.includes(world)||seen.has(p.weekId))continue;seen.add(p.weekId);const set=p.sets.find(s=>s.world===world&&s.students.includes(student));if(set)return {publication:p.id,weekName:p.weekName,set:copy(set)}}
  return {publication:'original-v1',weekName:'Contenido original de prueba',set:copy(this.seed.sets.find(s=>s.world===world))};
 }
 start(student,world){let r=this.data.runs.find(r=>r.student===student&&r.world===world&&!r.finished);if(r)return r;const a=this.assigned(student,world);r=this.data.runs.find(r=>r.student===student&&r.world===world&&r.publication===a.publication);if(r)return r;
  r={id:crypto.randomUUID(),student,world,publication:a.publication,weekName:a.weekName,questions:copy(a.set.questions),answers:{},results:{},history:[],startedAt:new Date(this.now()).toISOString(),finished:false};this.data.runs.push(r);return r;
 }
 answer(student,runId,questionId,value){const r=this.data.runs.find(r=>r.id===runId&&r.student===student);if(!r)throw new Error('Intento de otro alumno.');const i=r.questions.findIndex(q=>q.id===questionId);if(i<0)throw new Error('Pregunta ajena al recorrido.');const q=r.questions[i],ok=gradeWorldQuestion(q,value);
  r.answers[q.id]=copy(value);if(ok||r.results[q.id]!=='ok')r.results[q.id]=ok?'ok':'miss';r.history.push({questionId,value:copy(value),ok,at:new Date(this.now()).toISOString()});
  const phase=Math.floor(i/5),key=r.world+':'+phase;let earned=0;
  if(r.questions.slice(phase*5,phase*5+5).every(q=>r.results[q.id])&&!this.data.ledger[student][key]){this.data.ledger[student][key]=true;this.data.coins[student]++;earned=1}
  r.finished=r.questions.every(q=>r.results[q.id]);return {ok,earned};
 }
}

globalThis.WorldContent={CONTENT_WORLDS,CONTENT_TYPES,contentNorm,questionErrors,questionWarnings,gradeWorldQuestion,contentFingerprint,publicationErrors,importIntoSet,WorldContentDemo};
})();
