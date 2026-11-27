/* Supabase Auth REST, no external scripts. Tokens and TOTP secret stay in memory.
   No student data is requested until classroom-teacher/session authorizes aal2. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),CONFIG_KEY='archipelago_teacher_public_connection_v1';
const fixedProject=window.ARCHIPELAGO_SUPABASE?.url;
let missionPanel=null,missionStudents=[],worldContentPanel=null;
let config=null,session=null,generation=0,busy=false,factorId=null,qrUrl=null,verifiedFactors=[],pendingFactors=[],teacherAllowed=false,pendingImport=null;
function status(text){$('teacher-status').textContent=text}
function error(text){$('teacher-error').textContent=text}
function visible(id,show){$(id).hidden=!show}
function clearQr(){if(qrUrl)URL.revokeObjectURL(qrUrl);qrUrl=null;$('totp-qr').removeAttribute('src');$('totp-secret').value='';visible('qr-section',false)}
function clearPrivate(){TeacherStudents.close();$('new-student').reset();worldContentPanel?.destroy();worldContentPanel=null;$('teacher-world-content').replaceChildren();visible('teacher-world-content',false);missionPanel?.destroy();missionPanel=null;$('teacher-missions').replaceChildren();visible('teacher-missions',false);missionStudents=[];session=null;factorId=null;teacherAllowed=false;pendingImport=null;verifiedFactors=[];pendingFactors=[];clearQr();$('teacher-password').value='';$('totp-code').value='';$('issued-code').textContent='';$('secure-students').replaceChildren();$('import-target').replaceChildren();$('secure-import-preview').textContent='';$('import-json').value='';$('import-nickname').value='';visible('secure-import-confirm',false);visible('secure-panel',false);visible('mfa-section',false)}
function parseConfig(url,key){
 let u;try{u=new URL(url.trim())}catch{throw new Error('Copia la URL HTTPS de tu proyecto Supabase.')}if(u.protocol!=='https:'||!/^[-a-z0-9]+\.supabase\.co$/.test(u.hostname)||u.port||u.username||u.password||u.search||u.hash||!['','/'].includes(u.pathname))throw new Error('Copia la URL HTTPS de tu proyecto Supabase, sin rutas adicionales.');
 if(fixedProject&&u.origin!==fixedProject)throw new Error('Este panel solo admite el proyecto de pruebas.');
 key=key.trim();let allowed=/^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
 if(!allowed&&key.split('.').length===3){try{allowed=JSON.parse(atob(key.split('.')[1].replaceAll('-','+').replaceAll('_','/'))).role==='anon'}catch{}}
 if(!allowed)throw new Error('Usa únicamente una clave pública publishable o anon. No guardes claves secretas ni service_role.');
 return {url:u.origin,key};
}
function connected(){visible('config-section',!config);visible('password-section',!!config);if(config){$('project-label').textContent='Proyecto: '+new URL(config.url).hostname+'. Comprueba que coincide con tu panel de Supabase.'}}
async function jsonResponse(response){let data;try{data=await response.json()}catch{throw new Error('El servicio no devolvió una respuesta válida. Comprueba que la función está desplegada.')}
 if(!response.ok){const e=new Error(data.msg||data.error_description||data.message||data.error||'No se pudo completar la operación.');e.status=response.status;throw e}return data}
async function auth(path,{method='GET',body,token}={}){
 if(!config)throw new Error('Configura primero la conexión pública.');
 return jsonResponse(await fetch(config.url+'/auth/v1'+path,{method,headers:{apikey:config.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'}));
}
function useSession(data){if(typeof data.access_token!=='string'||typeof data.refresh_token!=='string')throw new Error('Supabase no devolvió una sesión válida.');session={access:data.access_token,refresh:data.refresh_token,until:Date.now()+Number(data.expires_in||3600)*1000}}
function current(epoch){if(epoch!==generation)throw new Error('La sesión cambió. Vuelve a iniciar sesión.')}
async function access(){if(!session)throw new Error('Inicia sesión de nuevo.');const epoch=generation;if(session.until<Date.now()+30000){const data=await auth('/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh}});current(epoch);useSession(data)}return session.access}
async function edge(path,{method='GET',body}={}){
 const epoch=generation,token=await access();current(epoch);
 const data=await jsonResponse(await fetch(config.url+'/functions/v1/classroom-teacher'+path,{method,headers:{apikey:config.key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'}));current(epoch);return data;
}
async function run(action){if(busy)return;busy=true;error('');const enabled=[...document.querySelectorAll('button:not(:disabled)')];enabled.forEach(b=>b.disabled=true);try{await action()}catch(e){error(e.message||'No se pudo conectar.');}finally{busy=false;enabled.filter(b=>b.isConnected).forEach(b=>b.disabled=false)}}
async function logout(){const token=session?.access;generation++;clearPrivate();connected();status('Sesión cerrada en este navegador.');if(token){try{await auth('/logout?scope=local',{method:'POST',token})}catch{error('La sesión local se ha borrado. No se pudo confirmar la revocación en Supabase.')}}}
async function setupMfa(){
 const epoch=generation,user=await auth('/user',{token:await access()});current(epoch);
 const factors=(user.factors||[]).filter(f=>f.factor_type==='totp');verifiedFactors=factors.filter(f=>f.status==='verified');pendingFactors=factors.filter(f=>f.status==='unverified');clearQr();factorId=null;
 visible('password-section',false);visible('mfa-section',true);visible('enroll-actions',false);visible('pending-actions',false);visible('totp-form',false);
 if(verifiedFactors.length){$('mfa-explanation').textContent='Abre tu aplicación y escribe el código actual. Ya tienes un segundo factor registrado.';$('factor-select').replaceChildren();for(const f of verifiedFactors){const option=document.createElement('option');option.value=f.id;option.textContent=f.friendly_name||'Mi aplicación';$('factor-select').append(option)}factorId=verifiedFactors[0].id;visible('factor-select-label',verifiedFactors.length>1);visible('totp-form',true);$('totp-code').focus()}
 else if(pendingFactors.length){$('mfa-explanation').textContent='Hay un registro pendiente de completar. No se puede recuperar su QR anterior desde Supabase.';visible('pending-actions',true)}
 else{$('mfa-explanation').textContent='TOTP está habilitado en el proyecto, pero falta registrar tu aplicación personal. Pulsa el botón para crear tu QR privado.';visible('enroll-actions',true)}
}
async function enroll(){
 const epoch=generation,data=await auth('/factors',{method:'POST',token:await access(),body:{factor_type:'totp',friendly_name:'Aplicación de profesora'}});current(epoch);
 if(!data.id||!data.totp?.qr_code||!data.totp?.secret)throw new Error('No se pudo preparar el QR de registro.');factorId=data.id;clearQr();
 // An SVG displayed as an img is not injected into the document and cannot run scripts.
 const qr=data.totp.qr_code;if(qr.startsWith('data:image/svg+xml'))$('totp-qr').src=qr;else{if(!qr.trim().startsWith('<svg')&&!qr.trim().startsWith('<?xml'))throw new Error('Formato de QR inesperado.');qrUrl=URL.createObjectURL(new Blob([qr],{type:'image/svg+xml'}));$('totp-qr').src=qrUrl}
 $('totp-secret').value=data.totp.secret;visible('qr-section',true);visible('enroll-actions',false);visible('pending-actions',false);visible('factor-select-label',false);visible('totp-form',true);status('Escanea el QR y verifica un código para terminar.');$('totp-code').focus();
}
async function authorizePanel(){
 teacherAllowed=false;visible('secure-panel',false);
 try{const allowed=await edge('/session');if(!allowed.teacherId)throw new Error('No se confirmó el permiso de profesora.');await loadStudents();teacherAllowed=true;clearQr();visible('mfa-section',false);visible('password-section',false);visible('secure-panel',true);status('Segundo factor y permiso de profesora confirmados por el servidor.');}
 catch(e){clearQr();visible('qr-section',false);$('totp-code').value='';status('El segundo factor se verificó, pero el panel sigue cerrado.');throw new Error('No se ha autorizado el panel: '+e.message+' Revisa classroom-teacher, tu User UID autorizado, las variables y el origen permitido. No desactives MFA.');}
}
async function loadStudents(){
 const data=await edge('/students');missionStudents=data.students||[];$('secure-students').replaceChildren();$('import-target').replaceChildren();
 const studentActions={run,request:edge,issued:text=>{$('issued-code').textContent=text},refresh:async()=>{
  pendingImport=null;visible('secure-import-confirm',false);$('secure-import-preview').textContent='';
  worldContentPanel?.destroy();worldContentPanel=null;visible('teacher-world-content',false);
  missionPanel?.destroy();missionPanel=null;visible('teacher-missions',false);
  await loadStudents();
 }};
 for(const s of missionStudents){
  $('secure-students').append(TeacherStudents.card(s,studentActions));
  if(!s.hasSave&&s.enabled){const option=document.createElement('option');option.value=s.id;option.textContent=s.displayName||s.nickname;$('import-target').append(option)}
 }
}
async function checkFunctions(){
 const raw=$('config-section').hidden?config?.url:$('project-url').value;
 let url;try{url=new URL(raw)}catch{throw new Error('Introduce primero la URL pública de tu proyecto.')}
 if(url.protocol!=='https:'||!/^[-a-z0-9]+\.supabase\.co$/.test(url.hostname)||url.port||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw new Error('Usa la URL HTTPS de tu proyecto, sin rutas adicionales.');
 if(fixedProject&&url.origin!==fixedProject)throw new Error('Este panel solo admite el proyecto de pruebas.');
 const results=[];
 for(const scope of ['student','teacher']){
  let response;try{response=await fetch(url.origin+'/functions/v1/classroom-'+scope+'/session',{method:'GET',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'})}catch{throw new Error('No se pudo comprobar classroom-'+scope+'. Revisa la conexión, el despliegue y CLASSROOM_ALLOWED_ORIGINS para '+location.origin+'.')}
  if(response.status!==401)throw new Error('classroom-'+scope+' respondió '+response.status+'; se esperaba 401 sin iniciar sesión. No continúes hasta revisar la configuración.');
  let payload;try{payload=await response.json()}catch{throw new Error('No se pudo identificar la respuesta de classroom-'+scope+'.')}
  const expected=scope==='student'?'Inicia sesión':'Inicia sesión como profesora';
  if(payload.error!==expected)throw new Error('classroom-'+scope+' devolvió 401, pero no se identifica nuestra función. Revisa Verify JWT with legacy secret y el archivo desplegado.');
  results.push('classroom-'+scope+': 401');
 }
 status(results.join(' · ')+'. Ambas funciones responden y rechazan accesos sin sesión. Esto aún no comprueba tu cuenta ni el segundo factor.');
}
for(const id of ['check-functions','check-functions-connected'])$(id).addEventListener('click',()=>run(checkFunctions));
$('supabase-config').addEventListener('submit',event=>{event.preventDefault();run(async()=>{const value=parseConfig($('project-url').value,$('public-key').value);generation++;clearPrivate();config=value;try{localStorage.setItem(CONFIG_KEY,JSON.stringify(config))}catch{status('Conexión disponible solo mientras esta página esté abierta.')}connected();status('Conexión pública preparada. Comprueba el proyecto antes de escribir tu contraseña.');})});
$('change-project').addEventListener('click',()=>run(async()=>{await logout();config=null;try{localStorage.removeItem(CONFIG_KEY)}catch{}connected()}));
$('password-form').addEventListener('submit',event=>{
 event.preventDefault();if(busy)return;const password=$('teacher-password').value;$('teacher-password').value='';
 run(async()=>{generation++;clearPrivate();const epoch=generation;if(!password)throw new Error('Escribe tu contraseña.');const data=await auth('/token?grant_type=password',{method:'POST',body:{email:$('teacher-email').value.trim(),password}});current(epoch);useSession(data);await setupMfa();});
});
$('enroll-factor').addEventListener('click',()=>run(enroll));
$('restart-pending').addEventListener('click',()=>run(async()=>{if(!confirm('¿Sustituir únicamente registros TOTP pendientes? Los factores verificados no se borrarán.'))return;const epoch=generation,user=await auth('/user',{token:await access()});current(epoch);const latest=(user.factors||[]).filter(f=>f.factor_type==='totp');if(latest.some(f=>f.status==='verified')){await setupMfa();status('Ya hay una aplicación verificada. Utiliza su código.');return}for(const f of latest.filter(f=>f.status==='unverified')){await auth('/factors/'+encodeURIComponent(f.id),{method:'DELETE',token:await access()});current(epoch)}await enroll()}));
$('factor-select').addEventListener('change',()=>{factorId=$('factor-select').value});
$('totp-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{const code=$('totp-code').value.trim();$('totp-code').value='';if(!/^\d{6}$/.test(code)||!factorId)throw new Error('Introduce las seis cifras actuales de la aplicación.');const epoch=generation,chosenFactor=factorId,token=await access();const challenge=await auth('/factors/'+encodeURIComponent(chosenFactor)+'/challenge',{method:'POST',token,body:{}});current(epoch);const verified=await auth('/factors/'+encodeURIComponent(chosenFactor)+'/verify',{method:'POST',token,body:{challenge_id:challenge.id,code}});current(epoch);useSession(verified);await authorizePanel();})});
for(const id of ['cancel-session','secure-logout'])$(id).addEventListener('click',()=>run(logout));
$('open-world-content').addEventListener('click',()=>run(async()=>{if(!teacherAllowed)return;await loadStudents();worldContentPanel?.destroy();visible('teacher-world-content',true);const epoch=generation,panel=await WorldContentTeacher.mount($('teacher-world-content'),{request:edge,students:missionStudents});if(epoch!==generation){panel.destroy();return}worldContentPanel=panel;}));
$('open-missions').addEventListener('click',()=>run(async()=>{if(!teacherAllowed)return;await loadStudents();visible('teacher-missions',true);missionPanel?.destroy();missionPanel=MagicMissions.mount($('teacher-missions'),{role:'teacher',request:edge,students:missionStudents});}));
$('reload-students').addEventListener('click',()=>run(async()=>{if(!teacherAllowed)throw new Error('Acceso no autorizado.');await loadStudents()}));
$('new-student').addEventListener('submit',event=>{
 event.preventDefault();
 if(busy||!teacherAllowed)return;
 const code=$('new-student-code').value;
 $('new-student-code').value='';
 $('issued-code').textContent='';
 run(async()=>{
  const result=await edge('/students',{method:'POST',body:{nickname:$('new-nickname').value,
   displayName:$('new-display-name').value,...(code?{code}:{})}});
  $('issued-code').textContent=result.code?result.student.nickname+' · código: '+result.code:'Cuenta creada con el código elegido.';
  event.target.reset();await loadStudents();
 });
});
$('new-import').addEventListener('submit',event=>{event.preventDefault();run(async()=>{pendingImport=null;visible('secure-import-confirm',false);if(!teacherAllowed)throw new Error('Acceso no autorizado.');const file=$('import-json').files[0];if(!file||file.size>350000)throw new Error('Elige un JSON de partida de menos de 350 KB.');const state=JSON.parse(await file.text()),nickname=$('import-target').selectedOptions[0]?.textContent;if($('import-nickname').value!==nickname)throw new Error('Confirma el nickname exacto de destino.');pendingImport={id:$('import-target').value,confirmNickname:nickname,state};$('secure-import-preview').textContent=JSON.stringify({destino:nickname,avatar:state.avatarName,worlds:Object.fromEntries(Object.entries(state.worlds||{}).map(([id,w])=>[id,Object.keys(w.results||{}).length]))},null,2);visible('secure-import-confirm',true)})});
$('secure-import-confirm').addEventListener('click',()=>run(async()=>{if(!teacherAllowed||!pendingImport)return;const {id,...body}=pendingImport;await edge('/students/'+encodeURIComponent(id)+'/import',{method:'POST',body});pendingImport=null;visible('secure-import-confirm',false);$('secure-import-preview').textContent='Partida ficticia asignada sin sobrescribir otra.';await loadStudents()}));
try{const saved=JSON.parse(localStorage.getItem(CONFIG_KEY)||'null');if(saved)config=parseConfig(saved.url,saved.key)}catch{try{localStorage.removeItem(CONFIG_KEY)}catch{}}
connected();if(config){$('project-url').value=config.url;$('public-key').value=config.key}status('Introduce solo tus datos de profesora; todavía no uses datos reales de menores.');
})();
