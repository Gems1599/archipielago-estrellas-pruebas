/* Reuses the existing editor, authenticated teacher transport and draft model. */
(()=>{'use strict';
async function mount(host,{request,students}){
 let alive=true,revision=0,engine,confirmedWeeks=new Map();
 const call=async(path,options)=>{const data=await request(path,options);if(!alive)throw Error('La sesión cambió.');return data};
 host.textContent='Consultando el gestor semanal…';
 let view;
 const accept=data=>{revision=data.revision;confirmedWeeks=new Map(data.library.weeks.map(w=>[w.id,JSON.stringify(w)]));if(engine)Object.assign(engine.data,data.library);return data};
 try{
  const data=accept(await call('/world-content'));
  engine=new WorldContent.WorldContentDemo({sets:[]},data.library);
  const save=async()=>{const changedWeeks=engine.data.weeks.filter(w=>JSON.stringify(w)!==confirmedWeeks.get(w.id));if(!changedWeeks.length)return;return accept(await call('/world-content',{method:'POST',body:{revision,changedWeeks}}));};
  engine.publish=async(weekId,worlds,requestId,activateAt)=>{
   await save();const data=accept(await call('/world-content/publish',{method:'POST',body:{revision,weekId,worlds,requestId,activateAt}}));return data.library.publications.at(-1);
  };
  engine.restore=async publicationId=>{const data=accept(await call('/world-content/restore',{method:'POST',body:{revision,publicationId}}));return data.library.weeks.find(w=>w.id===data.library.publications.find(p=>p.id===publicationId).weekId)};
  view=WorldContentManager.mount(host,{engine,students:students.filter(s=>s.enabled).map(s=>s.id),studentName:id=>students.find(s=>s.id===id)?.nickname||id,save,allowBackup:true,publicationMessage:'Preguntas publicadas en el servidor configurado. Los recorridos iniciados conservan su versión.'});
  host.addEventListener('click',download);
 }catch(e){if(alive)host.textContent=e.message;}
 async function download(event){const link=event.target.closest('a.content-download');if(!link)return;event.preventDefault();try{const name=link.getAttribute('href').split('/').at(-1),data=await call('/world-content/template',{method:'POST',body:{name}}),url=URL.createObjectURL(new Blob([Uint8Array.from(atob(data.data),c=>c.charCodeAt(0))]));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){if(alive){const status=host.querySelector('.content-status');if(status)status.textContent=e.message}}}
 return {destroy(){alive=false;host.removeEventListener('click',download);view?.destroy();host.replaceChildren()}};
}
globalThis.WorldContentTeacher=Object.freeze({mount});
})();
