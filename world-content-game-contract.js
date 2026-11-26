/* Generated integration contract; source: content/world-content-integration.mjs. */
(()=>{
const {CONTENT_WORLDS,questionErrors}=WorldContent;
/* Shared integration contracts. Pure adapters; the injected transport performs
   authenticated operations. No storage, migrations or game-state writes here. */
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const canonical=v=>JSON.stringify(v,(_key,value)=>object(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value);
const worlds=Object.keys(CONTENT_WORLDS);

function originalWorldPlan(state,seed,originalQuestions){
 if(!object(state)||!object(state.worlds??{})||seed?.schema!==1||!Array.isArray(seed.sets)||seed.sets.length!==5)throw Error('Partida o versión original inválida; no se ha modificado nada.');
 if(state.worldContentV1!==undefined)throw Error('La partida ya contiene enlaces de contenidos; revisa su versión antes de migrar.');
 const sets=new Map(),setIds=new Set();
 for(const set of seed.sets){
  if(!worlds.includes(set.world)||sets.has(set.world)||typeof set.id!=='string'||!set.id||setIds.has(set.id)||!Array.isArray(set.questions)||set.questions.length!==30)throw Error('Se necesitan cinco conjuntos originales de 30 preguntas.');
  if(new Set(set.questions.map(q=>q.id)).size!==30)throw Error('IDs originales duplicados.');
  if(!Array.isArray(originalQuestions?.[set.world])||originalQuestions[set.world].length!==30)throw Error('Falta el contenido original del juego.');
  set.questions.forEach((q,i)=>{
   if(questionErrors(q).length||q.archived||q.image)throw Error('El conjunto original contiene preguntas inválidas o modificadas.');
   const {id,image,archived,...actual}=q;
   if(canonical(actual)!==canonical(originalQuestions[set.world][i]))throw Error('Las preguntas no coinciden con las originales del juego.');
  });
  sets.set(set.world,set);setIds.add(set.id);
 }
 return {version:'original-v1',worlds:worlds.map(world=>{
  const set=sets.get(world),progress=state.worlds?.[world]??{};
  if(!object(progress)||!object(progress.results??{}))throw Error('Progreso de '+world+' inválido; requiere revisión.');
  for(const [key,value] of Object.entries(progress.results??{}))if(!/^(?:[0-9]|[12][0-9])$/.test(key)||!['ok','miss'].includes(value))throw Error('Resultado histórico inválido en '+world+'.');
  for(const [field,max] of [['index',30],['reviewIndex',29]])if(progress[field]!==undefined&&(!Number.isInteger(progress[field])||progress[field]<0||progress[field]>max))throw Error('Índice histórico inválido en '+world+'.');
  if(progress.remaining!==undefined&&(!Number.isInteger(progress.remaining)||progress.remaining<0))throw Error('Tiempo histórico inválido en '+world+'.');
  return {world,setId:set.id,questionIds:set.questions.map(q=>q.id),progress:structuredClone(progress),results:Object.entries(progress.results??{}).map(([index,status])=>({questionId:set.questions[Number(index)].id,status,answer:null}))};
 })};
}

// Proposed student wire format: alternatives needed to render, without mappings
// or answer keys. Teacher/private snapshots keep the existing complete questions.
function publicWorldQuestion(q){
 const errors=questionErrors(q);if(errors.length)throw Error(errors.join('\n'));
 const out={id:q.id,type:q.type,prompt:q.prompt};
 if(q.image)throw Error('Las imágenes necesitan rutas privadas autorizadas antes de usar este contrato.');
 if(['choice','story'].includes(q.type))out.options=[...q.options];
 if(q.type==='match'){out.items=q.answer.map(([left])=>left);out.options=[...new Set(q.answer.map(([,right])=>right))].sort();}
 if(q.type==='classify'){out.items=q.answer.items.map(([item])=>item);out.categories=[...q.answer.categories];}
 return out;
}
function worldAnswerRequest(run,questionId,value,{revision,requestId}){
 if(!object(run)||typeof run.id!=='string'||!run.id||typeof run.version!=='string'||!run.version||!Array.isArray(run.questions))throw Error('Recorrido versionado inválido.');
 const q=run.questions.find(q=>q.id===questionId);
 if(!q||!Number.isSafeInteger(revision)||revision<0||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId??''))throw Error('Pregunta, revisión o solicitud inválida.');
 if(['match','classify'].includes(q.type)){
  const choices=q.type==='match'?q.options:q.categories;
  if(!Array.isArray(q.items)||!Array.isArray(choices)||!Array.isArray(value)||value.length!==q.items.length||value.some(x=>typeof x!=='string'||!choices.includes(x)))throw Error('Completa todas las relaciones o categorías.');
 }else if(['choice','story','fill'].includes(q.type)){
  if(typeof value!=='string'||!value.trim()||value.length>6000||(['choice','story'].includes(q.type)&&!q.options?.includes(value)))throw Error('Respuesta inválida.');
 }else throw Error('Tipo no compatible con los mundos.');
 // Identity is supplied by the authenticated transport/session, never a form ID.
 return {runId:run.id,version:run.version,questionId,answer:structuredClone(value),revision,requestId};
}

// Student port. Mounted only when the authenticated session advertises the
// weekly capability; disabled by default in the real runtime.
function worldContentStudentClient(request,{enabled=false}={}){
 const guard=()=>{if(enabled!==true)throw Object.assign(Error('Contenidos semanales pendientes de integración y activación.'),{code:'world_content_disabled'})};
 return Object.freeze({
  async start(world){guard();if(!worlds.includes(world))throw Error('Mundo inválido.');return request('/world-content/start',{method:'POST',body:{world}})},
  async answer(run,questionId,value,options){guard();return request('/world-content/answer',{method:'PUT',body:{...worldAnswerRequest(run,questionId,value,options),...(options.gameRevision!==undefined?{gameRevision:options.gameRevision}:{})}})}
 });
}

globalThis.WorldContentIntegration={originalWorldPlan,publicWorldQuestion,worldAnswerRequest,worldContentStudentClient};
})();
