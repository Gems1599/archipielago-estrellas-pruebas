/* Generated shared mission rules. */
(()=>{
/* Shared, deterministic mission validation/grading. No clocks or browser trust. */
const MISSION_WORLDS={math:'Matemáticas',english:'English',span:'Castellano',val:'Valencià',nature:'Medi Natural'};
const MISSION_TYPES={written:'Respuesta escrita',single:'Opción múltiple',multi:'Selección múltiple',match:'Unir o relacionar',order:'Ordenar',images:'Elegir imágenes',boolean:'Verdadero o falso',blanks:'Completar huecos'};
function normalizeMission(value){
 const fail=message=>{throw new Error(message)},text=(x,max,required=true)=>{if(typeof x!=='string'||x.length>max||(required&&!x.trim()))fail('Texto de misión inválido.');return x.trim()};
 if(!value||typeof value!=='object'||!MISSION_WORLDS[value.world])fail('Elige una asignatura válida.');
 const id=text(value.id,36);if(!/^[a-f0-9-]{36}$/.test(id))fail('Identificador de misión inválido.');
 const timer=value.timer||{};if(!['elapsed','countdown','unlimited'].includes(timer.mode))fail('Cronómetro inválido.');
 if(timer.mode==='countdown'&&(!Number.isInteger(timer.seconds)||timer.seconds<60||timer.seconds>28800))fail('El límite debe estar entre 1 y 480 minutos.');
 const image=x=>{if(!x)return '';if(typeof x!=='string'||!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(x))fail('Ruta de imagen inválida.');return x};
 if(!Array.isArray(value.questions)||value.questions.length<1||value.questions.length>40)fail('Cada misión necesita entre 1 y 40 preguntas.');
 const seen=new Set(),questions=value.questions.map(q=>{
  const qid=text(q.id,50);if(!/^[a-zA-Z0-9_-]+$/.test(qid)||seen.has(qid)||!MISSION_TYPES[q.type])fail('Pregunta inválida o repetida.');seen.add(qid);
  const r={id:qid,type:q.type,prompt:text(q.prompt,6000),image:image(q.image),manual:q.type==='written'&&q.manual===true,options:[],correct:[]};
  if(['single','multi','images','match','order'].includes(q.type)){
   if(!Array.isArray(q.options)||q.options.length<2||q.options.length>12)fail('Añade entre 2 y 12 opciones.');
   r.options=q.options.map((o,i)=>({id:'o'+i,label:text(o.label,500),...(q.type==='match'?{right:text(o.right,500)}:{}),...(q.type==='images'?{image:image(o.image)}:{})}));
   if(q.type==='images'&&r.options.some(o=>!o.image))fail('Falta una imagen de respuesta.');
  }
  if(r.manual)return r;
  if(!Array.isArray(q.correct)||!q.correct.length||q.correct.length>20)fail('Indica la solución correcta.');
  r.correct=q.correct.map(x=>text(x,6000));
  if(['single','multi','images'].includes(q.type)&&r.correct.some(x=>!r.options.some(o=>o.id===x)))fail('La solución no corresponde a las opciones.');
  if(['single','images','boolean'].includes(q.type)&&r.correct.length!==1)fail('Elige una respuesta correcta.');
  if(q.type==='boolean'&&!['true','false'].includes(r.correct[0]))fail('Indica verdadero o falso.');
  if(q.type==='order'&&(r.correct.length!==r.options.length||r.correct.some((x,i)=>x!=='o'+i)))fail('El orden del editor debe ser el orden correcto.');
  if(q.type==='match'&&(r.correct.length!==r.options.length||r.correct.some((x,i)=>x!=='o'+i+':o'+i)))fail('Revisa las parejas correctas.');
  if(q.type==='blanks'&&((r.prompt.match(/___/g)||[]).length!==r.correct.length))fail('Escribe ___ por cada hueco e indica sus soluciones, una por línea.');
  return r;
 });
 const startAt=value.startAt?new Date(value.startAt):null;if(startAt&&!Number.isFinite(+startAt))fail('Fecha de inicio inválida.');
 const students=[...new Set(value.students||[])];if(students.length>200||students.some(x=>typeof x!=='string'||!/^[a-f0-9-]{36}$/.test(x)))fail('Alumnos inválidos.');
 return {id,world:value.world,title:text(value.title,160),story:text(value.story||'',6000,false),active:value.active===true,startAt:startAt?.toISOString()||null,timer:{mode:timer.mode,seconds:timer.mode==='countdown'?timer.seconds:null},questions,students,revision:Number.isSafeInteger(value.revision)?value.revision:0};
}
function missionPublic(spec){return {...spec,questions:spec.questions.map(({correct,...q})=>q)}}
function missionGrade(spec,answers={},reviews={}){
 const norm=x=>String(x??'').normalize('NFC').trim().toLocaleLowerCase('es');
 const rows=spec.questions.map(q=>{
  const answer=answers[q.id]||[];let score=null;
  if(q.manual){if(Number.isFinite(reviews[q.id]?.score))score=reviews[q.id].score}
  else if(q.type==='written')score=q.correct.some(c=>norm(c)===norm(answer[0]))?1:0;
  else {let a=[...answer],c=[...q.correct];if(['multi','match'].includes(q.type)){a.sort();c.sort()}if(q.type==='blanks'){a=a.map(norm);c=c.map(norm)}score=JSON.stringify(a)===JSON.stringify(c)?1:0}
  return {id:q.id,score,feedback:reviews[q.id]?.feedback||''};
 });
 const pending=rows.filter(r=>r.score===null).length,points=rows.reduce((n,r)=>n+(r.score||0),0);
 return {rows,pending,correct:rows.filter(r=>r.score===1).length,wrong:rows.filter(r=>r.score!==null&&r.score<1).length,score:pending?null:Math.round(points/rows.length*100)/10,percent:pending?null:Math.round(points/rows.length*100)};
}

globalThis.MissionModel={MISSION_WORLDS,MISSION_TYPES,normalizeMission,missionPublic,missionGrade};
})();
