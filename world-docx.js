/* Structured DOCX reader: local only, bounded ZIP/XML, no HTML conversion or external requests. */
(()=>{'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main',MAX=10*1024*1024;
const fieldKey=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const worlds={MATEMATICAS:'math',ENGLISH:'english',INGLES:'english',CASTELLANO:'span',VALENCIA:'val',VALENCIANO:'val','MEDI NATURAL':'nature','MEDIO NATURAL':'nature'};
const types={CHOICE:'choice',OPCIONES:'choice',FILL:'fill',ESCRITA:'fill',MATCH:'match',RELACIONAR:'match',CLASSIFY:'classify',CLASIFICAR:'classify',STORY:'story',PROBLEMA:'story'};
const fields=['PREGUNTA','ID','MUNDO','TIPO','ENUNCIADO','OPCIONES','SOLUCION','CATEGORIAS','EXPLICACION','PISTA','ESTRICTO'];
function candidate(raw){
 const lines=x=>(x||'').split('\n').map(s=>s.trim()).filter(Boolean),type=types[fieldKey(raw.TIPO||'')]||'',world=worlds[fieldKey(raw.MUNDO||'')]||'';
 let answer=raw.SOLUCION||'';
 if(type==='match'||type==='classify'){
  const pairs=lines(answer).map(line=>line.split('|').map(s=>s.trim()));answer=type==='match'?pairs:{categories:lines(raw.CATEGORIAS),items:pairs};
 }
 return {world,q:{id:(raw.ID||'').trim(),type,prompt:raw.ENUNCIADO||'',options:lines(raw.OPCIONES),answer,explain:raw.EXPLICACION||'',hint:raw.PISTA||'',strict:fieldKey(raw.ESTRICTO||'NO')==='SI',image:'',archived:false}};
}
function rowErrors(raw,q,world){const e=WorldContent.questionErrors(q);if(!world)e.unshift('Mundo desconocido o ausente.');if(raw.PREGUNTA!=='ARCHIPIELAGO-MUNDOS-1')e.unshift('Falta la marca ARCHIPIELAGO-MUNDOS-1.');if(raw.ESTRICTO&&!['SI','NO'].includes(fieldKey(raw.ESTRICTO)))e.push('ESTRICTO solo admite SI o NO.');return e}
function inspectZip(bytes){
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(d.getUint32(i,true)===0x06054b50){end=i;break}
 if(end<0||d.getUint16(end+4,true)||d.getUint16(end+6,true))throw new Error('No es un DOCX ZIP compatible.');
 const count=d.getUint16(end+10,true),size=d.getUint32(end+12,true),offset=d.getUint32(end+16,true);if(count>512||offset+size>end)throw new Error('El DOCX contiene demasiados archivos o una estructura inválida.');
 let at=offset,total=0,documentSize=0,documentCRC=0;const seen=new Set();
 for(let i=0;i<count;i++){
  if(at+46>bytes.length||d.getUint32(at,true)!==0x02014b50)throw new Error('Directorio ZIP inválido.');
  const flags=d.getUint16(at+8,true),method=d.getUint16(at+10,true),expanded=d.getUint32(at+24,true),n=d.getUint16(at+28,true),extra=d.getUint16(at+30,true),comment=d.getUint16(at+32,true);
  const name=new TextDecoder().decode(bytes.subarray(at+46,at+46+n));if(flags&1||![0,8].includes(method)||expanded===0xffffffff||name.includes('..')||name.startsWith('/')||seen.has(name))throw new Error('DOCX cifrado, repetido o no compatible.');seen.add(name);total+=expanded;
  if(total>20*1024*1024)throw new Error('El documento descomprimido es demasiado grande.');if(name==='word/document.xml'){documentSize=expanded;documentCRC=d.getUint32(at+16,true)}
  if(/vbaProject|embeddings\//i.test(name))throw new Error('No se admiten macros ni documentos incrustados.');at+=46+n+extra+comment;
 }
 if(!seen.has('[Content_Types].xml')||!documentSize||documentSize>4*1024*1024)throw new Error('Falta el documento Word o supera 4 MB de texto.');
 return {documentSize,documentCRC,hasImages:[...seen].some(n=>n.startsWith('word/media/'))};
}
async function extract(bytes){const meta=inspectZip(bytes);let output=null,total=0,error=null;
 const unzip=new fflate.Unzip(file=>{if(file.name!=='word/document.xml')return;const chunks=[];file.ondata=(err,data,final)=>{if(err){error=err;return}total+=data.length;if(total>4*1024*1024){file.terminate();throw new Error('El texto Word supera el límite seguro.')}chunks.push(data);if(final){output=new Uint8Array(total);let at=0;for(const part of chunks){output.set(part,at);at+=part.length}}};file.start()});unzip.register(fflate.UnzipInflate);
 for(let i=0;i<bytes.length;i+=1024)unzip.push(bytes.subarray(i,i+1024),i+1024>=bytes.length);
 if(error||!output||output.length!==meta.documentSize)throw new Error('No se pudo descomprimir el texto del Word.');let crc=0xffffffff;for(const byte of output){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}if(((crc^0xffffffff)>>>0)!==meta.documentCRC)throw new Error('El Word está dañado: no coincide su suma de comprobación.');return {xml:new TextDecoder('utf-8',{fatal:true}).decode(output),hasImages:meta.hasImages};
}
async function read(file){
 if(file.size>MAX||!/\.docx$/i.test(file.name))throw new Error('Elige un .docx de menos de 10 MB.');const {xml,hasImages}=await extract(new Uint8Array(await file.arrayBuffer()));
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('El XML contiene declaraciones no permitidas.');const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw new Error('XML de Word dañado.');
 for(const tag of ['ins','del','moveFrom','moveTo'])if(doc.getElementsByTagNameNS(NS,tag).length)throw new Error('Acepta o rechaza los cambios controlados en Word antes de importar.');
 const tables=[...doc.getElementsByTagNameNS(NS,'tbl')];if(!tables.length||tables.length>300)throw new Error('Utiliza la plantilla: una tabla por pregunta, máximo 300 por importación.');
 const rows=tables.map((table,index)=>{
  const raw={},errors=[];for(let parent=table.parentElement;parent;parent=parent.parentElement)if(parent.localName==='tbl')errors.push('No se admiten tablas dentro de otras tablas.');
  for(const tr of [...table.children].filter(e=>e.localName==='tr')){
   const cells=[...tr.children].filter(e=>e.localName==='tc');if(cells.length!==2){errors.push('Cada fila debe tener dos columnas.');continue}
   const text=cell=>[...cell.getElementsByTagNameNS(NS,'p')].map(p=>[...p.getElementsByTagNameNS(NS,'t')].map(t=>t.textContent).join('')).join('\n').trim();
   const key=fieldKey(text(cells[0]));if(!fields.includes(key)){errors.push('Campo desconocido: '+key);continue}if(Object.hasOwn(raw,key))errors.push('Campo repetido: '+key);raw[key]=text(cells[1]);
  }
  const {world,q}=candidate(raw);return {index:index+1,raw,world,q,errors:errors.concat(rowErrors(raw,q,world))};
 });
 const seen=new Set();for(const r of rows){const key=r.world+':'+r.q.id;if(seen.has(key))r.errors.push('ID repetido dentro del documento.');seen.add(key)}
 return {rows,warnings:hasImages?['Las imágenes incrustadas de Word no se importan automáticamente. Añádelas y revísalas desde el editor antes de publicar.']:[]};
}
globalThis.WorldDocx={read,candidate};
})();
