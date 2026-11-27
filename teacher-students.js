/* The private panel receives summaries only. Local catalogs supply all artwork. */
window.TeacherStudents=(()=>{
 const subjects={math:'Matemáticas',english:'Inglés',span:'Castellano',val:'Valencià',nature:'Medi Natural'};
 const $=id=>document.getElementById(id);
 const dialog=$('student-action-dialog'),field=$('student-action-value');
 let pending=null;
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el};
 function button(text,click){const el=node('button',text);el.type='button';el.addEventListener('click',click);return el}
 function close(){pending=null;field.value='';dialog.close()}
 $('student-action-cancel').onclick=close;
 dialog.addEventListener('close',()=>{if(!dialog.open){pending=null;field.value=''}});
 $('student-action-form').onsubmit=event=>{
  event.preventDefault();
  const operation=pending,value=field.value;
  close();
  if(operation)operation(value);
 };
 function confirmAction(student,action,submit){
  const password=action==='code';
  const remove=action==='delete';
  const title=password?'Cambiar código':remove?'Eliminar alumno definitivamente':'Reiniciar partida';
  const lost='Se eliminarán el progreso, respuestas, intentos, monedas, medallas, cromos, atuendos, personalización del avatar, diario, entregas, correcciones, premios y recibos de compra.';
  $('student-action-title').textContent=title+' · '+student.displayName;
  $('student-action-description').textContent=password
   ? 'Las sesiones anteriores dejarán de funcionar. La partida se conserva. Deja el campo vacío para generar un código.'
   : lost+' '+(remove?'También se perderán la cuenta y sus asignaciones.':'Se conservarán la cuenta, el código y sus asignaciones.');
  $('student-action-field-name').textContent=password?'Nuevo código (12–128 caracteres)':'Escribe el alias exacto: '+student.nickname;
  field.type=password?'password':'text';field.required=!password;
  field.minLength=password?12:0;field.maxLength=password?128:32;
  field.autocomplete=password?'new-password':'off';
  field.value='';pending=submit;
  $('student-action-confirm').textContent=title;
  dialog.showModal();field.focus();
 }
 function section(title){const block=node('section',undefined,'student-detail-section');block.append(node('h4',title));return block}
 function list(block,items,empty){
  if(!items.length){block.append(node('p',empty));return}
  const ul=node('ul',undefined,'student-rewards');
  for(const {label,image} of items){
   const li=node('li');
   if(image){const img=node('img');img.src=image;img.alt='';img.loading='lazy';li.append(img)}
   li.append(node('span',label));ul.append(li);
  }
  block.append(ul);
 }
 function medal(id){
  const [kind,world]=id.split(':');
  const subject=subjects[world],slug=MEDAL_SUBJECT_FILES[world];
  const prefix={adventurer:'aventurero',conquered:'mundo-conquistado','legacy-plus':'mundo-conquistado'}[kind];
  const art=slug&&prefix?prefix+'-'+slug+'.png':'estrella-semana.png';
  const label=subject?({adventurer:'Aventurero del Mundo',conquered:'Mundo Conquistado','legacy-plus':'Medalla Plus'}[kind]||'Medalla')+' · '+subject
   : id==='legacy-week-plus'?'Medalla Semanal Plus':id==='weekly-star:week-1'?'Estrella de la Semana':'Medalla de la colección';
  return {label,image:MEDAL_ART_FILES.has(art)?'assets/medallas/'+art:null};
 }
 function avatarView(detail){
  const block=section('Avatar actual'),saved=detail.illustratedAvatar;
  if(saved?.enabled&&['girl-original-v1','girl-layered-v1'].includes(saved.template)){
   const portrait=node('span',undefined,'storybook-avatar illustrated-girl teacher-avatar-preview');
   const equipment=Object.fromEntries(Object.entries(detail.equipment||{}).filter(([slot,id])=>shopProduct(id)?.slot===slot&&detail.owned.includes(id)));
   if(saved.template==='girl-layered-v1'){
    portrait.classList.add('girl-uses-layers');
    const template=node('template');
    template.innerHTML=girlComposition(layeredGirlSelection(saved),equipment,false);
    for(const layer of template.content.querySelectorAll('[style]')){
     const styles=layer.getAttribute('style');layer.removeAttribute('style');layer.style.cssText=styles;
    }
    portrait.append(template.content);
    for(const image of portrait.querySelectorAll('[data-girl-layer]')){
     if(image.complete)void tintGirlLayer(image);
     else image.addEventListener('load',()=>void tintGirlLayer(image),{once:true});
    }
   }else{const image=node('img');image.src=GIRL_ART;image.alt='Avatar ilustrado';portrait.append(image)}
   block.append(portrait);
  }else{
   const portrait=node('div');
   portrait.innerHTML=renderClassicAvatar(.63,detail.avatar??{});
   block.append(portrait);
  }
  return block;
 }
 function profile(host,student,detail){
  const worlds=section('Progreso de los mundos');let stars=0;
  const rows=Object.entries(subjects).map(([id,name])=>{
   const value=detail.worlds[id],old=student.progress?.worlds?.[id];
   const correct=value?.correct??old?.correct??0;
   stars+=correct;
   return {label:name+' · '+correct+'/30 estrellas · '+(value?value.answered+'/30 preguntas':(old?.phases??0)+'/6 fases')};
  });
  worlds.append(node('p',stars+'/150 estrellas · '+detail.coins+' monedas estrella','student-totals'));
  list(worlds,rows,'');
  const medals=section('Medallas');
  list(medals,detail.medals.filter(id=>typeof id==='string').map(medal),'Todavía no tiene medallas.');
  const stickers=section('Cromos');
  list(stickers,detail.stickers.map(id=>{const card=STICKER_CATALOG.find(c=>c.id===id);return {label:card?.name||'Cromo de la colección',image:card?.image}}),'Todavía no tiene cromos.');
  const missions=section('Misiones mágicas');
  const statuses={pending:'Pendiente',in_progress:'En curso',submitted:'Entregada · pendiente de corrección',graded:'Corregida'};
  list(missions,detail.missions.map(m=>({label:m.title+' · '+statuses[m.status]+(m.score!=null?' · '+m.score+'/10':'')+(!m.active?' · no disponible ahora':'')})),'Todavía no tiene misiones asignadas.');
  const clothes=section('Armario');
  list(clothes,detail.owned.map(id=>{const product=shopProduct(id);return {label:(product?.name||'Atuendo de la colección')+(Object.values(detail.equipment||{}).includes(id)?' · equipado':''),image:product?.art}}),'Todavía no tiene atuendos comprados.');
  host.replaceChildren(worlds,medals,stickers,missions,clothes,avatarView(detail));
 }
 function card(student,{run,request,refresh,issued}){
  const {nickname,id}=student;
  const article=node('article',undefined,'student-card');
  const header=node('header',undefined,'student-card-heading');
  const name=node('div');name.append(node('h3',student.displayName||nickname),node('p',nickname));
  header.append(name,node('span',student.enabled?'Activa':'Desactivada',student.enabled?'student-badge':'student-badge student-disabled'));
  const last=student.lastAccess?new Date(student.lastAccess).toLocaleString('es-ES',{timeZone:'Europe/Madrid'}):'Sin accesos';
  article.append(header,node('p','Último acceso · '+last));
  const details=node('div',undefined,'student-details');
  details.hidden=true;
  const url=action=>'/students/'+encodeURIComponent(id)+'/'+action;
  const mutate=(action,body)=>request(url(action),{method:'POST',body});
  const actions=node('div',undefined,'student-actions');
  const detailButton=button('Ver ficha',()=>run(async()=>{
   if(!details.hidden){details.hidden=true;details.replaceChildren();detailButton.textContent='Ver ficha';return}
   const data=await request(url('profile'));
   profile(details,student,data);details.hidden=false;detailButton.textContent='Ocultar ficha';
  }));
  const edit=node('details',undefined,'student-edit');
  edit.append(node('summary','Editar datos'));
  const form=node('form',undefined,'student-form');
  const input=(label,value,max,pattern)=>{
   const wrapper=node('label',label),control=node('input');control.value=value;control.required=true;control.maxLength=max;
   if(pattern)control.pattern=pattern;
   wrapper.append(control);form.append(wrapper);return control;
  };
  const nameInput=input('Nombre visible',student.displayName||nickname,80);
  const alias=input('Alias de acceso',nickname,32,'demo-[a-z0-9_\\-]{2,27}');
  const update=enabled=>run(async()=>{
   await mutate('edit',{displayName:nameInput.value,nickname:alias.value,enabled});await refresh();
  });
  form.append(node('button','Guardar datos'));
  form.onsubmit=event=>{event.preventDefault();update(student.enabled)};
  edit.append(form);
  actions.append(detailButton,button('Cambiar código',()=>confirmAction(student,'code',code=>run(async()=>{
   const result=await mutate('code',code?{code}:{});issued(result.code?nickname+' · código: '+result.code:'Código actualizado. Las sesiones anteriores se han revocado.');
  }))),button(student.enabled?'Desactivar cuenta':'Activar cuenta',()=>run(async()=>{
   await mutate('edit',{displayName:student.displayName||nickname,nickname,enabled:!student.enabled});await refresh();
  })));
  const danger=node('div',undefined,'student-actions student-danger');
  for(const [action,label] of [['restart','Reiniciar partida'],['delete','Eliminar alumno']]){
   danger.append(button(label,()=>confirmAction(student,action,confirmation=>run(async()=>{
    await mutate(action,{confirmation});await refresh();
   }))));
  }
  article.append(actions,edit,details,danger);
  return article;
 }
 return Object.freeze({card,close});
})();
