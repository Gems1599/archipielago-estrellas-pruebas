/* Edit this catalog to add supplied art. Never reuse IDs or activate an undefined objective.
   Week 1: the owner approved all 30 correct per subject and all 150 for the special. */
const STICKER_WEEKS=[{id:'week-1',label:'Semana 1',enabled:true,objective:'correct-original-world-v1'}];
const STICKER_CATALOG=[
 ...[['math','matematicas','Matemáticas'],['english','english','English'],['span','castellano','Castellano'],['val','valencia','Valencià'],['nature','medi-natural','Medi Natural']].map(([world,file,subject])=>({id:'week-1:'+world,week:'week-1',world,name:'Recuerdo de '+subject,description:'Un recuerdo de tu aventura de '+subject+'.',image:'assets/cromos/semana-01/cromo-'+file+'.png',artReady:STICKER_ART_FILES['assets/cromos/semana-01/cromo-'+file+'.png']===true,condition:'correct-original-world-v1'})),
 {id:'week-1:special',week:'week-1',world:null,name:'El encuentro de los cinco mundos',description:'Un recuerdo especial de la aventura compartida por los cinco mundos.',image:'assets/cromos/semana-01/cromo-especial.png',artReady:STICKER_ART_FILES['assets/cromos/semana-01/cromo-especial.png']===true,condition:'correct-original-five-worlds-v1'}
];
