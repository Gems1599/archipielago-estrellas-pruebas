'use strict';

const $ = id => document.getElementById(id);
const canvas = $('avatar');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;
const work = document.createElement('canvas');
const mask = document.createElement('canvas');
work.width = mask.width = width;
work.height = mask.height = height;
const workCtx = work.getContext('2d', {willReadFrequently: true});
const maskCtx = mask.getContext('2d', {willReadFrequently: true});
const cache = new Map();
const hairColors = {castano: [-35,-25,-15], cobre: [24,0,-10], violeta: [14,-18,49]};
const skinColors = {dorado: [-12,-23,-32], moreno: [-51,-61,-67], profundo: [-89,-90,-87]};
const eyeColors = {miel: [24,13,-11], verde: [-39,25,12], azul: [-55,4,64]};
const hatFits = {
  corto: {x:215,y:8,w:595,line:252}, ondas: {x:187,y:0,w:650,line:252},
  coleta: {x:188,y:0,w:650,line:250}, trenzas: {x:195,y:3,w:635,line:250},
  'rizo-corto': {x:205,y:5,w:615,line:251}, 'rizo-largo': {x:174,y:0,w:675,line:250},
  liso: {x:194,y:2,w:636,line:250}, 'coleta-baja': {x:196,y:2,w:632,line:251},
  'dos-coletas': {x:183,y:0,w:658,line:252}, mono: {x:190,y:0,w:644,line:251},
  'flequillo-recto': {x:196,y:2,w:632,line:254}
};
const claspFits = {basico:[570,538], vestido:[563,533], tunica:[515,529]};
let request = 0;

function asset(id) {
  if (!cache.has(id)) {
    const image = new Image();
    image.src = 'recursos/' + id + '.webp';
    cache.set(id, image.decode().then(() => image));
  }
  return cache.get(id);
}


function toneAdjustment(channel, change) {
  const shading = change < 0 ? Math.min(1,channel / 180) : Math.min(1,(255-channel)/75);
  return change * shading;
}

function colorize(image, variants, target = ctx) {
  workCtx.clearRect(0,0,width,height);
  workCtx.drawImage(image,0,0);
  const plate = workCtx.getImageData(0,0,width,height);
  const pixels = plate.data;
  for (const {colors, matte, exclude} of variants) {
    if (!colors) continue;
    let weights;
    if (matte) {
      maskCtx.clearRect(0,0,width,height);
      maskCtx.drawImage(matte,0,0);
      weights = maskCtx.getImageData(0,0,width,height).data;
    }
    for (let i=0;i<pixels.length;i+=4) {
      if (!pixels[i+3]) continue;
      const opacity = weights ? weights[i+3]/255 : 1;
      const weight = exclude ? 1-opacity : opacity;
      if (!weight) continue;
      for (let n=0;n<3;n++) pixels[i+n] += weight * toneAdjustment(pixels[i+n],colors[n]);
    }
  }
  workCtx.putImageData(plate,0,0);
  target.drawImage(work,0,0);
}

function clipHairBelowBrim(fit) {
  ctx.beginPath();
  ctx.moveTo(0,fit.line+12);
  ctx.quadraticCurveTo(width/2,fit.line-19,width,fit.line+12);
  ctx.lineTo(width,height);
  ctx.lineTo(0,height);
  ctx.closePath();
  ctx.clip();
}

function drawFreckles(tone) {
  const dots = [[434,383,2.3],[441,390,2],[448,381,2.4],[455,387,2.1],
    [465,383,1.6],[475,381,2],[484,387,1.5],[501,382,2.1],[514,383,1.8],
    [529,387,2.1],[541,382,2.2],[550,389,2],[560,386,2.3],[568,392,1.7]];
  ctx.fillStyle = tone === 'profundo' ? '#542821a8' : '#9b48277a';
  for (const [x,y,r] of dots) {
    ctx.beginPath();
    ctx.arc(x,y,r,0,2*Math.PI);
    ctx.fill();
  }
}

async function render() {
  const own = ++request;
  const controls = Object.fromEntries([...document.querySelectorAll('select')].map(x => [x.id,x.value]));
  const head = '1';
  const hair = controls.pelo;
  const body = controls.ropa;
  const hasHat = $('sombrero').checked;
  const hasClasp = $('broche').checked;
  const skin = skinColors[controls.piel];
  const eyes = eyeColors[controls.ojos];
  const shade = hairColors[controls['color-pelo']];
  const fit = hatFits[hair];
  const hairKey = hair;
  const paintHair = art => shade ? colorize(art,[{colors:shade}]) : ctx.drawImage(art,0,0);
  try {
    const [bodyArt,bodyMask,face,iris,hairBack,hat,clasp,eyeGuard,hairFront] = await Promise.all([
      asset(body), skin ? asset(body+'-piel') : null,
      asset('rostro-'+head), eyes ? asset('iris-'+head) : null, asset(hairKey+'-detras'),
      hasHat ? asset('sombrero') : null, hasClasp ? asset('broche') : null,
      skin ? asset('ojos-'+head) : null, asset(hairKey+'-frente')
    ]);
    if (own !== request) return;
    ctx.clearRect(0,0,width,height);
    ctx.save();
    if (hat) {
      clipHairBelowBrim(fit);
      if (hair === 'rizo-corto') {
        ctx.beginPath();
        ctx.ellipse(512,320,200,170,0,0,Math.PI*2);
        ctx.clip();
      }
    }
    paintHair(hairBack);
    ctx.restore();
    if (skin) colorize(bodyArt,[{colors:skin,matte:bodyMask}]); else ctx.drawImage(bodyArt,0,0);
    if (skin || eyes) {
      colorize(face,[{colors:skin,matte:eyeGuard,exclude:true},{colors:eyes,matte:iris}]);
    } else ctx.drawImage(face,0,0);
    if ($('pecas').checked) drawFreckles(controls.piel);
    ctx.save();
    if (hat) clipHairBelowBrim(fit);
    paintHair(hairFront);
    ctx.restore();
    if (hat) ctx.drawImage(hat,fit.x,fit.y,fit.w,fit.line+12-fit.y);
    if (clasp) {
      const [x,y] = claspFits[body];
      ctx.drawImage(clasp,x-17,y-17,34,34);
    }
    canvas.setAttribute('aria-label', ['pelo','ropa','piel','ojos','color-pelo']
      .map(id => $(id).selectedOptions[0].textContent).join(' · '));
    $('escena').classList.toggle('vestidor',controls.fondo === 'vestidor');
    canvas.dataset.ajustePelo = hairKey;
    canvas.dataset.pecas = String($('pecas').checked);
    canvas.dataset.composicion = [head,hair,body,controls['color-pelo'],controls.piel,controls.ojos,hasHat,hasClasp].join('/');
    $('estado').textContent = '';
  } catch {
    if (own === request) $('estado').textContent = 'No se han podido cargar las ilustraciones del vestidor.';
  }
}

$('descargar').addEventListener('click', () => {
  try {
    const link = document.createElement('a');
    link.download = 'everluna-personaje.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch {
    $('estado').textContent = 'Abre el vestidor mediante un servidor local para guardar la imagen.';
  }
});
document.querySelector('form').addEventListener('change',render);
render();
