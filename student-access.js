/* Pupil opaque session stays in this tab's memory. Reload requires signing in
   again, but all game data is loaded from Supabase, never from a local profile. */
window.StudentAccess=(()=>{
 let token=null,student=null,epoch=0,expiresAt=null;
 const base=()=>{const u=new URL(window.ARCHIPELAGO_SUPABASE?.url||'');if(u.protocol!=='https:'||!/^[-a-z0-9]+\.supabase\.co$/.test(u.hostname)||u.port||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw new Error('La conexión de Supabase no está configurada.');return u.origin+'/functions/v1/classroom-student'};
 const identity=()=>student?{id:student.id,nickname:student.nickname}:null;
 const forget=()=>{epoch++;token=null;student=null;expiresAt=null};
 async function send(path,{method='GET',body,expectedStudentId,keepalive=false}={}){
  if(expectedStudentId&&expectedStudentId!==student?.id){const e=new Error('La cuenta de esta pestaña ha cambiado.');e.status=409;throw e}
  const savedEpoch=epoch,savedToken=token,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(base()+path,{method,headers:{'Content-Type':'application/json',...(savedToken?{'X-Student-Session':savedToken}:{})},body:body===undefined?undefined:JSON.stringify(body),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal,keepalive});
   let data;try{data=await response.json()}catch{throw new Error('La función de alumnos no devolvió una respuesta válida.')}
   if(savedEpoch!==epoch)throw new Error('La sesión cambió durante la operación.');
   if(!response.ok){const e=new Error(data.error||'No se pudo completar la operación.');e.status=response.status;e.code=data.code;throw e}return data;
  }catch(e){if(e.name==='AbortError')throw new Error('La conexión ha tardado demasiado. El guardado no está confirmado.');throw e}finally{clearTimeout(timer)}
 }
 async function login(nickname,code){
  forget();const current=epoch,data=await send('/login',{method:'POST',body:{nickname,code}});
  if(current!==epoch||typeof data.session!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(data.session)||typeof data.student?.id!=='string'||typeof data.student?.nickname!=='string')throw new Error('La función no devolvió una sesión válida.');
  token=data.session;student={id:data.student.id,nickname:data.student.nickname};expiresAt=data.expiresAt;return identity();
 }
 async function logout(){const who=identity();try{if(who)await send('/logout',{method:'POST',body:{studentId:who.id},expectedStudentId:who.id})}finally{forget()}}
 function showLogin(host,onLogin,message=''){
  host.innerHTML=`<div class="classroom-card student-login-card"><img src="assets/escenario/optimizado/castillo-central.webp" alt="Castillo mágico"><h1>Tu aventura te espera</h1><p class="classroom-note">Prueba con cuentas ficticias. Entra con el nickname y el código que te entrega tu profesora.</p><form id="student-login-form"><label>Nickname<input id="student-nickname" name="nickname" required maxlength="32" autocomplete="username" autocapitalize="none" spellcheck="false"></label><label>Código secreto<input id="student-code" name="code" type="password" required maxlength="128" autocomplete="off" spellcheck="false"></label><button>Entrar en mi aventura</button></form><p id="student-login-error" class="classroom-error" role="alert"></p><p><a href="profesora-supabase.html" target="_blank" rel="noopener noreferrer">Acceso privado de profesora</a></p><p class="classroom-note" data-preview-revision="avatar-tienda-r2">Avatar y Tienda · revisión 2</p><button id="student-export-old" type="button">Descargar partida local anterior</button><p class="classroom-note">Las partidas anteriores no se asignan automáticamente a ninguna cuenta.</p></div>`;
  const form=host.querySelector('form'),error=host.querySelector('#student-login-error');error.textContent=message;
  form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button');if(button.disabled)return;button.disabled=true;error.textContent='';const nickname=form.nickname.value.trim(),code=form.code.value;form.code.value='';try{const user=await login(nickname,code);await onLogin(user)}catch(e){error.textContent=e.message||'No se pudo conectar. Comprueba el nickname, el código y la conexión.'}finally{button.disabled=false}});
  host.querySelector('#student-export-old').onclick=()=>{
   try{const raw=localStorage.getItem('vera_archipelago_magica_v1')||localStorage.getItem('vera_archipelago_v1');if(!raw)throw new Error('No hay una partida anterior en este navegador.');JSON.parse(raw);const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='partida-local-para-revision.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){error.textContent=e.message}
  };
 }
 return Object.freeze({identity,login,request:send,logout,forget,showLogin});
})();
