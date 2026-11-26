/* Local, registration-specific colour masks for the unchanged nina-v1 PNG.
   The image is never sent anywhere. Every renderer uses the same cached result.
   Masks refer to this exact 1024 × 1536 drawing, not to arbitrary future bases. */
const GIRL_PALETTE={
 hairColor:[['brown','Castaño','#805033'],['black','Negro','#242333'],['blond','Rubio','#dfc17d'],['red','Pelirrojo','#b9582f'],['white','Blanco','#e6e4df'],['pink','Rosa','#c97dab'],['blue','Azul','#628cca'],['violet','Violeta','#956ab9']],
 eyes:[['brown','Marrón','#995a24'],['blue','Azul','#548dbe'],['green','Verde','#64945b'],['honey','Miel','#b98d36'],['grey','Gris','#828c96'],['violet','Violeta','#9567b5']],
 skin:[['original','Original','#fbb783'],['very-light','Muy clara','#f7d9c1'],['light','Clara','#ebbe9a'],['medium','Media','#c9926b'],['olive','Oliva','#b48a60'],['brown','Morena','#946140'],['dark','Oscura','#654131']]
};
const girlSourceCache=new Map(),girlTintCache=new Map();
function girlImageSource(url){
 if(!girlSourceCache.has(url))girlSourceCache.set(url,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1536;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,1024,1536);resolve(ctx.getImageData(0,0,1024,1536))};img.onerror=()=>{girlSourceCache.delete(url);reject(new Error('No se pudo cargar una capa del avatar'))};img.src=url}));
 return girlSourceCache.get(url);
}
let girlSkinMask;
function girlRegisteredSkinMask(){
 if(girlSkinMask)return girlSkinMask;
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1536;const c=canvas.getContext('2d',{willReadFrequently:true});c.fillStyle='#fff';
 c.fillRect(0,0,1024,398);
 c.fill(new Path2D('M490 378 L570 378 L572 412 Q578 429 604 437 Q592 472 539 477 Q490 477 457 440 Q487 431 490 408 Z'));
 c.fill(new Path2D('M0 650 L286 650 L355 688 L295 804 L254 936 L0 965 Z M696 644 L1024 644 L1024 970 L771 938 L720 803 L674 690 Z'));
 c.fill(new Path2D('M380 877 Q410 895 446 881 Q471 891 491 878 L514 880 Q540 896 568 884 Q605 893 640 882 L682 869 L740 1536 L275 1536 Z'));
 // Eye whites, pupils, brows and lip outlines are protected by source-colour
 // tests below, avoiding skin-coloured halos around rectangular cut-outs.
 girlSkinMask=c.getImageData(0,0,1024,1536).data;return girlSkinMask;
}
function girlRGB(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
async function girlTintedSource(url,kind,selection){
 if((kind==='hair'&&selection.hairColor==='brown')||(kind==='base'&&selection.skin==='original'&&selection.eyes==='brown'))return url;
 const key=JSON.stringify(kind==='hair'?[url,kind,selection.hairColor]:[url,kind,selection.skin,selection.eyes]);
 if(!girlTintCache.has(key)){
  const pending=girlImageSource(url).then(source=>{
   const data=new Uint8ClampedArray(source.data),skin=GIRL_PALETTE.skin.find(x=>x[0]===selection.skin),eye=GIRL_PALETTE.eyes.find(x=>x[0]===selection.eyes),hair=GIRL_PALETTE.hairColor.find(x=>x[0]===selection.hairColor);
   const mask=kind==='base'?girlRegisteredSkinMask():null,targetSkin=girlRGB(skin[2]),targetEye=girlRGB(eye[2]),targetHair=girlRGB(hair[2]);
   for(let i=0;i<data.length;i+=4){if(data[i+3]===0)continue;const r=data[i],g=data[i+1],b=data[i+2],pixel=i/4,x=pixel%1024,y=Math.floor(pixel/1024);
    if(kind==='hair'){
     if(selection.hairColor==='brown')continue;
     const light=(r*.299+g*.587+b*.114)/255,reference=.36;
     for(let j=0;j<3;j++)data[i+j]=light<reference?targetHair[j]*Math.pow(light/reference,.85):targetHair[j]+(255-targetHair[j])*(light-reference)/(1-reference);
    }else{
     const iris=((x-461)/24)**2+((y-260)/27)**2<1||((x-588)/24)**2+((y-247)/27)**2<1;
     const inEye=(x>401&&x<509&&y>211&&y<299)||(x>543&&x<641&&y>196&&y<285);
     const eyePaint=iris&&r>55&&g<170&&r-g>12&&g-b>10;
     const whiteOrInk=inEye&&((Math.max(r,g,b)-Math.min(r,g,b)<65&&g>165)||Math.max(r,g,b)<90);
     const faceInk=y<400&&((y<212&&g<115)||((x>484&&x<591&&y>321&&y<352)&&g<125));
     if(eyePaint&&selection.eyes!=='brown'){
      const light=(r*.299+g*.587+b*.114)/255;
      for(let j=0;j<3;j++)data[i+j]=light<.35?targetEye[j]*light/.35:targetEye[j]+(255-targetEye[j])*(light-.35)/.65;
     }else if(selection.skin!=='original'&&mask[i+3]&&!eyePaint&&!whiteOrInk&&!faceInk&&!(y>870&&r-g<25)){
      const coverage=mask[i+3]/255;
      const shade=Math.pow((r*.299+g*.587+b*.114)/196,1.1);
      for(let j=0;j<3;j++)data[i+j]=data[i+j]*(1-coverage)+targetSkin[j]*shade*coverage;
     }
    }
   }
   const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1536;canvas.getContext('2d').putImageData(new ImageData(data,1024,1536),0,0);return canvas.toDataURL('image/png');
  });girlTintCache.set(key,pending);pending.catch(()=>girlTintCache.delete(key));
  // Bound decoded colour variants without persisting images or account data.
  if(girlTintCache.size>48)girlTintCache.delete(girlTintCache.keys().next().value);
 }
 return girlTintCache.get(key);
}
async function tintGirlLayer(img){
 if(img.dataset.tintStarted)return;img.dataset.tintStarted='yes';
 const selection={skin:img.dataset.skin,eyes:img.dataset.eyes,hairColor:img.dataset.hairColor};
 try{const src=await girlTintedSource(img.getAttribute('src'),img.dataset.girlLayer,selection);if(img.isConnected){img.src=src;await img.decode();img.dataset.tintReady='yes'}}
 catch{if(img.isConnected){img.dataset.tintError='yes';document.querySelector('[data-avatar-colour-status]')?.replaceChildren(document.createTextNode('No se pudo aplicar el color. Conservamos la ilustración; vuelve a abrir el vestidor.'))}}
}
